import type { Effect } from "./effects";

export type LlmChoice = {
  id: "A" | "B" | "C" | "D";
  text: string;
};

export type LlmReply = {
  narrative: string;
  choices: LlmChoice[];
  effects: Effect[];
  warnings?: string[];
  meta?: {
    phase?: string;
  };
};

export type LLMReplyEnvelope = {
  story?: {
    narrative?: string;
    choiceResult?: string;
  };
  nextMoves?: Array<{ id: string; text: string; hint?: string }>;
  proposedEffects?: Effect[];
  timeDelta?: { slotAdvance?: number; dayAdvance?: number };
  debug?: { model?: string; latencyMs?: number; rawText?: string; usageMetadata?: unknown; warnings?: string; promptChars?: number };
};

const DEFAULT_NEXT_MOVES: NonNullable<LLMReplyEnvelope["nextMoves"]> = [
  { id: "A", text: "继续观察" },
  { id: "B", text: "休息片刻" }
];

export function validateAndSanitizeLLMEnvelope(input: unknown): { envelope: LLMReplyEnvelope; warnings: string[] } {
  const warnings: string[] = [];
  const env: LLMReplyEnvelope = {};

  if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    // story
    if (obj.story && typeof obj.story === "object") {
      const s = obj.story as Record<string, unknown>;
      env.story = {};
      if (typeof s.narrative === "string") env.story.narrative = s.narrative;
      if (typeof s.choiceResult === "string") env.story.choiceResult = s.choiceResult;
      if (!env.story.narrative && !env.story.choiceResult) delete env.story;
    }
    // nextMoves
    if (Array.isArray(obj.nextMoves)) {
      const moves: NonNullable<LLMReplyEnvelope["nextMoves"]> = [];
      for (const m of obj.nextMoves) {
        if (!m || typeof m !== "object") continue;
        const id = (m as any).id;
        const text = (m as any).text;
        const hint = (m as any).hint;
        if (typeof id === "string" && typeof text === "string") {
          moves.push({ id, text, hint: typeof hint === "string" ? hint : undefined });
        } else {
          warnings.push("invalid-nextMove");
        }
      }
      if (moves.length > 0) env.nextMoves = moves;
    }
    // proposedEffects (light check)
    if (Array.isArray(obj.proposedEffects)) {
      env.proposedEffects = obj.proposedEffects as Effect[];
    }
    // timeDelta
    if (obj.timeDelta && typeof obj.timeDelta === "object") {
      const td = obj.timeDelta as Record<string, unknown>;
      const slotAdvance = typeof td.slotAdvance === "number" ? td.slotAdvance : undefined;
      const dayAdvance = typeof td.dayAdvance === "number" ? td.dayAdvance : undefined;
      if (slotAdvance !== undefined || dayAdvance !== undefined) {
        env.timeDelta = { slotAdvance, dayAdvance };
      }
    }
    // debug
    if (obj.debug && typeof obj.debug === "object") {
      const d = obj.debug as Record<string, unknown>;
      env.debug = {
        model: typeof d.model === "string" ? d.model : undefined,
        latencyMs: typeof d.latencyMs === "number" ? d.latencyMs : undefined,
        rawText: typeof d.rawText === "string" ? d.rawText : undefined,
        usageMetadata: d.usageMetadata,
        warnings: typeof d.warnings === "string" ? d.warnings : undefined
      };
    }
  }

  if (!env.story && (!env.nextMoves || env.nextMoves.length === 0)) {
    warnings.push("missing-story-and-nextMoves");
    env.nextMoves = DEFAULT_NEXT_MOVES;
  }
  if (!env.nextMoves || env.nextMoves.length === 0) {
    env.nextMoves = DEFAULT_NEXT_MOVES;
    warnings.push("default-nextMoves");
  }

  return { envelope: env, warnings };
}
