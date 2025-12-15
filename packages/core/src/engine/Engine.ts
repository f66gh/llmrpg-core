import type { Effect } from "../schema/effects";
import type { EventDef } from "../schema/events";
import type { GameState } from "../schema/game";
import type { Choice, PlayerAction, StepResult } from "../schema/step";
import { applyEffects } from "./applyEffects";
import { EventDirector } from "./EventDirector";
import { EventRunner } from "./EventRunner";
import { RulesEngine } from "./RulesEngine";
import { StateStore } from "./StateStore";

export type StepHook = (state: GameState, action: PlayerAction) => Effect[];

type EngineOptions = {
  beforeStepHooks?: StepHook[];
  afterStepHooks?: StepHook[];
};

export class Engine {
  constructor(
    private readonly store: StateStore<GameState>,
    private readonly rules: RulesEngine<GameState>,
    private readonly events: EventRunner<GameState>,
    private readonly director?: EventDirector,
    private readonly beforeStepHooks: StepHook[] = [],
    private readonly afterStepHooks: StepHook[] = []
  ) {}

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

    let nextStateResult = applyEffects(current, [turnEffect]);
    warnings.push(...nextStateResult.warnings);

    // Before-step hooks
    for (const hook of this.beforeStepHooks) {
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
    if (this.director && typeof pendingId === "string" && pendingId) {
      const pendingEvent = this.director.getEventById(pendingId);
      if (pendingEvent) {
        const choiceDef = pendingEvent.choices.find((c) => c.id === action.id);
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

    if (this.director) {
      const event = this.director.pickEvent(nextStateResult.state);
      if (event) {
        const pickEffects: Effect[] = [
          { op: "set", path: "flags.__pendingEventId", value: event.id },
          { op: "set", path: "flags.__lastEventId", value: event.id },
          { op: "pushLog", entry: event.narrative }
        ];
        applied.push(...pickEffects);
        nextStateResult = applyEffects(nextStateResult.state, pickEffects);
        warnings.push(...nextStateResult.warnings);
        narrative = event.narrative;
        choices = this.director.getChoices(event);
        debug.push(`picked event ${event.id}`);
      } else {
        debug.push("no eligible event");
      }
    }

    // After-step hooks
    for (const hook of this.afterStepHooks) {
      const effs = hook(nextStateResult.state, action) ?? [];
      if (effs.length > 0) {
        applied.push(...effs);
        debug.push(`afterStep applied ${effs.length} effect(s)`);
        nextStateResult = applyEffects(nextStateResult.state, effs);
        warnings.push(...nextStateResult.warnings);
      }
    }

    this.store.setState(nextStateResult.state);

    return {
      state: nextStateResult.state,
      narrative,
      choices,
      applied,
      warnings,
      debug
    };
  }

  /** Demo factory: minimal engine for quick UI bootstrapping */
  static createDemo(initialState: GameState) {
    const store = new StateStore<GameState>(initialState);
    const rules = new RulesEngine<GameState>();
    const events = new EventRunner<GameState>();
    return new Engine(store, rules, events);
  }

  static createFromWorld(initialState: GameState, events: EventDef[], opts?: EngineOptions) {
    const store = new StateStore<GameState>(initialState);
    const rules = new RulesEngine<GameState>();
    const runner = new EventRunner<GameState>();
    const director = new EventDirector({ events });
    return new Engine(
      store,
      rules,
      runner,
      director,
      opts?.beforeStepHooks ?? [],
      opts?.afterStepHooks ?? []
    );
  }
}
