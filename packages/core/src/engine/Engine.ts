import type { Effect } from "../schema/effects";
import type { EventDef } from "../schema/events";
import type { GameState } from "../schema/game";
import { ensureMemory, appendRecentTurn } from "../schema/game";
import type { Choice, Move, PlayerAction, StepResult } from "../schema/step";
import type { AdHocEvent } from "../llm/adHocEvent";
import { validateAndSanitizeAdHocEvent } from "../llm/adHocEvent";
import { applyEffects } from "./applyEffects";
import { EventDirector } from "./EventDirector";
import { EventRunner } from "./EventRunner";
import { RulesEngine } from "./RulesEngine";
import { StateStore } from "./StateStore";
import type { NarrateInput, NarrateOutput } from "../llm/narrator";
import { guardEffects, type EffectGuardsConfig } from "./effectsGuards";
import type { LLMReplyEnvelope } from "../schema/llm";
import { validateAndSanitizeLLMEnvelope } from "../schema/llm";
import { mapAdHocEventToEnvelope } from "../llm/envelopeAdapters";
import { SummaryManager, type SummaryManagerOptions } from "../llm/summaryManager";

export type StepHook = (state: GameState, action: PlayerAction) => Effect[];

type EngineOptions = {
  beforeStepHooks?: StepHook[];
  afterStepHooks?: StepHook[];
  enableLLMNarration?: boolean;
  enableLLMEffectProposal?: boolean;
  worldId?: string;
  narrate?: (input: NarrateInput) => NarrateOutput;
  generateAdHocEvent?: (state: GameState) => unknown; // raw LLM output (LLMReplyEnvelope | AdHocEvent)
  generateNextMoves?: (state: GameState, event: EventDef | null) => Move[];
  effectGuards?: EffectGuardsConfig;
  summary?: SummaryManager | SummaryManagerOptions;
};

const DEFAULT_MOVES: Move[] = [
  { id: "A", text: "继续观察" },
  { id: "B", text: "休息片刻" }
];

export class Engine {
  constructor(
    private readonly store: StateStore<GameState>,
    private readonly rules: RulesEngine<GameState>,
    private readonly events: EventRunner<GameState>,
    private readonly director?: EventDirector,
    private readonly options: EngineOptions = {}
  ) {
    this.summaryManager =
      options.summary instanceof SummaryManager
        ? options.summary
        : new SummaryManager(
            typeof options.summary === "object" && !(options.summary instanceof SummaryManager) ? options.summary : undefined
          );
  }

  private readonly summaryManager: SummaryManager;

  private buildInteractableMoves(eligible: EventDef[], excludeId?: string, limit = 4): Move[] {
    const moves: Move[] = [];
    for (const ev of eligible) {
      if (excludeId && ev.id === excludeId) continue;
      const text = ev.title ?? ev.narrative ?? ev.id;
      moves.push({ id: `interact:${ev.id}`, text });
      if (moves.length >= limit) break;
    }
    return moves;
  }

  tick() {
    const state = this.store.getState();
    const updated = this.rules.apply(state);
    this.store.setState(updated);
    this.events.flush(this.store);
    return this.store.getState();
  }

  step(action: PlayerAction): StepResult {
    const current = this.store.getState();
    const applied: Effect[] = [];
    const warnings: string[] = [];
    const debug: string[] = [];

    // Always advance turn
    const turnEffect: Effect = {
      op: "set",
      path: "meta.turn",
      value: current.meta.turn + 1
    };

    applied.push(turnEffect);
    debug.push("step: +1 turn");
    debug.push(`effectProposal:${this.options.enableLLMEffectProposal ? "on" : "off"}`);

    let nextStateResult = applyEffects(current, [turnEffect]);
    warnings.push(...nextStateResult.warnings);

    // Before-step hooks
    const beforeHooks = this.options.beforeStepHooks ?? [];
    for (const hook of beforeHooks) {
      const effs = hook(nextStateResult.state, action) ?? [];
      if (effs.length > 0) {
        applied.push(...effs);
        debug.push(`beforeStep applied ${effs.length} effect(s)`);
        nextStateResult = applyEffects(nextStateResult.state, effs);
        warnings.push(...nextStateResult.warnings);
      }
    }

    // Resolve pending event choice
    const pendingId = nextStateResult.state.flags.__pendingEventId;
    if (action.type === "choice" && this.director && typeof pendingId === "string" && pendingId) {
      const pendingEvent = this.director.getEventById(pendingId);
      if (pendingEvent) {
        const choiceDef = pendingEvent.choices?.find((c) => c.id === action.id);
        const resolveEffects: Effect[] = [
          { op: "pushLog", entry: `Chose ${action.id}` },
          { op: "set", path: "flags.__pendingEventId", value: "" }
        ];
        if (choiceDef) {
          resolveEffects.push(...choiceDef.effects);
          debug.push(`choice ${action.id} resolved for event ${pendingId}`);
        } else {
          warnings.push(`choice ${action.id} not found for event ${pendingId}`);
          debug.push(`choice ${action.id} missing for event ${pendingId}`);
        }
        applied.push(...resolveEffects);
        nextStateResult = applyEffects(nextStateResult.state, resolveEffects);
        warnings.push(...nextStateResult.warnings);
      } else {
        warnings.push(`pending event ${pendingId} not found`);
        debug.push(`pending event ${pendingId} missing, clearing flag`);
        const clearPending: Effect = { op: "set", path: "flags.__pendingEventId", value: "" };
        applied.push(clearPending);
        nextStateResult = applyEffects(nextStateResult.state, [clearPending]);
        warnings.push(...nextStateResult.warnings);
      }
    }

    let narrative = "No events available.";
    let choices: Choice[] = [
      { id: "A", text: "Choice A" },
      { id: "B", text: "Choice B" },
      { id: "C", text: "Choice C" },
      { id: "D", text: "Choice D" }
    ];
    let nextMoves: Move[] | undefined = undefined;
    let moveSource: StepResult["moveSource"] = "static";
    let llmProposedEffects: Effect[] | undefined = undefined;
    let acceptedEffects: Effect[] | undefined = undefined;
    let rejectedEffects: Array<{ effect: Effect; reason: string }> | undefined = undefined;
    let pickedEvent: EventDef | null = null;
    let storyText: string | undefined = undefined;
    let rawEventNarrative: string | undefined = undefined;

    if (this.director) {
      const eligible = this.director.listEligible(nextStateResult.state);
      let event = eligible[0] ?? null;
      let llmEnvelope: LLMReplyEnvelope | null = null;

      if (!event && this.options.generateAdHocEvent) {
        try {
          const raw = this.options.generateAdHocEvent(nextStateResult.state);

          // Try envelope path first
          const maybeEnvelope = raw as any;
          const hasEnvelopeShape =
            maybeEnvelope &&
            typeof maybeEnvelope === "object" &&
            (maybeEnvelope.story !== undefined || maybeEnvelope.nextMoves !== undefined);

          if (hasEnvelopeShape) {
            const { envelope, warnings: warn } = validateAndSanitizeLLMEnvelope(maybeEnvelope);
            llmEnvelope = envelope;
            if (warn.length > 0) warnings.push(...warn);
            debug.push("llm-envelope-encounter");
          } else {
            const { event: sanitized, warnings: warn } = validateAndSanitizeAdHocEvent(raw);
            const mapped = mapAdHocEventToEnvelope(sanitized);
            const { envelope, warnings: envWarn } = validateAndSanitizeLLMEnvelope(mapped);
            llmEnvelope = envelope;
            if (warn.length > 0) warnings.push(...warn);
            if (envWarn.length > 0) warnings.push(...envWarn);
            debug.push("llm-ad-hoc-event");
          }
        } catch (err) {
          debug.push(`llm-ad-hoc-error ${(err as Error)?.message ?? ""}`);
        }
      }

      if (event) {
        pickedEvent = event;
        const pickEffects: Effect[] = [
          { op: "set", path: "flags.__pendingEventId", value: event.id },
          { op: "set", path: "flags.__lastEventId", value: event.id },
          { op: "pushLog", entry: event.narrative }
        ];
        applied.push(...pickEffects);
        nextStateResult = applyEffects(nextStateResult.state, pickEffects);
        warnings.push(...nextStateResult.warnings);
        narrative = event.narrative;
        rawEventNarrative = event.narrative;
        storyText = event.narrative;
        if (event.choices && event.choices.length > 0) {
          choices = this.director.getChoices(event);
          moveSource = "static";
        } else if (this.options.generateNextMoves) {
          const moves = this.options.generateNextMoves(nextStateResult.state, event);
          if (moves && moves.length > 0) {
            nextMoves = moves;
            moveSource = "llm";
          }
        }
        debug.push(`picked event ${event.id}`);
      } else if (llmEnvelope) {
        narrative = llmEnvelope.story?.narrative ?? "LLM encounter";
        rawEventNarrative = narrative;
        storyText = narrative;
        llmProposedEffects = llmEnvelope.proposedEffects;
        nextMoves = llmEnvelope.nextMoves && llmEnvelope.nextMoves.length > 0 ? llmEnvelope.nextMoves : DEFAULT_MOVES;
        moveSource = "llm";
        const logEffect: Effect = { op: "pushLog", entry: narrative };
        applied.push(logEffect);
        nextStateResult = applyEffects(nextStateResult.state, [logEffect]);
        warnings.push(...nextStateResult.warnings);
        debug.push("llm-encounter-used");
      } else {
        debug.push("no eligible event");
      }

      // Append local interactable suggestions (eligible events) as moves
      const localMoves = eligible.length > 0 ? this.buildInteractableMoves(eligible, pickedEvent?.id) : [];
      if (localMoves.length > 0) {
        if (nextMoves && nextMoves.length > 0) {
          const seen = new Set(nextMoves.map((m) => m.id));
          const merged = [...nextMoves];
          for (const m of localMoves) {
            if (!seen.has(m.id)) merged.push(m);
          }
          nextMoves = merged;
          moveSource = moveSource === "llm" ? "mixed" : moveSource;
        } else {
          nextMoves = localMoves;
          moveSource = moveSource ?? "static";
        }
      }
    }

    // Fallback nextMoves when no static choices available
    if ((!pickedEvent || !pickedEvent.choices || pickedEvent.choices.length === 0) && !nextMoves) {
      nextMoves = DEFAULT_MOVES;
      moveSource = moveSource ?? "static";
    }

    // After-step hooks
    const afterHooks = this.options.afterStepHooks ?? [];
    for (const hook of afterHooks) {
      const effs = hook(nextStateResult.state, action) ?? [];
      if (effs.length > 0) {
        applied.push(...effs);
        debug.push(`afterStep applied ${effs.length} effect(s)`);
        nextStateResult = applyEffects(nextStateResult.state, effs);
        warnings.push(...nextStateResult.warnings);
      }
    }

    // Optional: LLM narration rewrite (text only)
    if (!storyText) storyText = narrative;
    if (!rawEventNarrative) rawEventNarrative = narrative;
    if (this.options.enableLLMNarration && this.options.narrate && pickedEvent) {
      try {
        const narrateInput: NarrateInput = {
          worldId: this.options.worldId ?? "unknown",
          time: nextStateResult.state.time,
          location: nextStateResult.state.location,
          eventId: pickedEvent.id,
          eventTitle: pickedEvent.title,
          eventNarrative: narrative,
          choices: pickedEvent.choices?.map((c) => ({ id: c.id, text: c.text })) ?? [],
          selectedChoiceId: action.type === "choice" ? action.id : "A",
          stateSummary: {
            meters: nextStateResult.state.meters,
            tags: nextStateResult.state.tags,
            flags: nextStateResult.state.flags
          }
        };
        const out = this.options.narrate(narrateInput);
        if (out && typeof out.rewrittenNarrative === "string") {
          const tail = out.rewrittenChoiceResult ? `\n${out.rewrittenChoiceResult}` : "";
          storyText = `${out.rewrittenNarrative}${tail}`;
          debug.push("narration: rewritten");
        } else {
          debug.push("narration: fallback (invalid output)");
        }
      } catch (err) {
        debug.push(`narration: error ${(err as Error)?.message ?? ""}`.trim());
      }
    }

    // Guard and optionally apply LLM proposed effects (if provided externally in nextMoves pipeline)
    if (this.options.enableLLMEffectProposal && llmProposedEffects && llmProposedEffects.length > 0) {
      const { acceptedEffects: acc, rejectedEffects: rej } = guardEffects(llmProposedEffects, this.options.effectGuards);
      if (acc.length > 0) {
        const appliedGuarded = applyEffects(nextStateResult.state, acc);
        applied.push(...acc);
        acceptedEffects = acc;
        nextStateResult = appliedGuarded;
        warnings.push(...appliedGuarded.warnings);
        debug.push(`llm-effects-accepted-${acc.length}`);
      }
      if (rej.length > 0) {
        rejectedEffects = rej;
        debug.push(`llm-effects-rejected-${rej.length}`);
      }
    }

    this.store.setState(nextStateResult.state);

    // Summary / memory update
    const withEntry = appendRecentTurn(nextStateResult.state, {
      turn: nextStateResult.state.meta.turn,
      time: nextStateResult.state.time,
      location: nextStateResult.state.location,
      eventId: pickedEvent?.id,
      moveId: action.type === "move" ? action.id : undefined,
      choiceId: action.type === "choice" ? action.id : undefined,
      brief: storyText ?? narrative,
      effects: applied.map((e) => e.op).join(",")
    });

    if (this.summaryManager.shouldSummarize(withEntry)) {
      try {
        const mem = withEntry.memory!;
        const newSummary = this.summaryManager.summarize(mem.summary ?? "", mem.recentTurns);
        withEntry.memory = { ...mem, summary: newSummary };
        debug.push("summary-updated");
      } catch (err) {
        debug.push(`summary-failed ${(err as Error)?.message ?? ""}`);
      }
    }

    this.store.setState(withEntry);

    return {
      state: withEntry,
      narrative,
      storyText,
      rawEventNarrative,
      choices,
      nextMoves,
      moveSource,
      llmProposedEffects,
      acceptedEffects,
      rejectedEffects,
      applied,
      warnings,
      debug
    };
  }

  /** Demo factory: minimal engine for quick UI bootstrapping */
  static createDemo(initialState: GameState) {
    const store = new StateStore<GameState>(ensureMemory(initialState));
    const rules = new RulesEngine<GameState>();
    const events = new EventRunner<GameState>();
    return new Engine(store, rules, events);
  }

  static createFromWorld(initialState: GameState, events: EventDef[], opts?: EngineOptions) {
    const store = new StateStore<GameState>(ensureMemory(initialState));
    const rules = new RulesEngine<GameState>();
    const runner = new EventRunner<GameState>();
    const director = new EventDirector({ events });
    return new Engine(store, rules, runner, director, {
      ...opts,
      beforeStepHooks: opts?.beforeStepHooks ?? [],
      afterStepHooks: opts?.afterStepHooks ?? []
    });
  }
}
