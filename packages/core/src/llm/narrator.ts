import type { GameState } from "../schema/game";
import type { MemoryState } from "../schema/game";

export type NarrateInput = {
  worldId: string;
  time: GameState["time"];
  location: GameState["location"];
  eventId: string;
  eventTitle?: string;
  eventNarrative: string;
  choices: Array<{ id: string; text: string }>;
  selectedChoiceId: string;
  stateSummary?: {
    meters?: Partial<GameState["meters"]>;
    tags?: string[];
    flags?: Partial<GameState["flags"]>;
    memory?: {
      summary?: string;
      recentTurns?: MemoryState["recentTurns"];
    };
  };
};

export type NarrateOutput = {
  rewrittenNarrative: string;
  rewrittenChoiceResult: string;
  tone?: string;
  style?: string;
};

/**
 * Runtime guard for NarrateOutput. Keeps LLM results from introducing effects or unexpected shapes.
 */
export const isNarrateOutput = (value: unknown): value is NarrateOutput => {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const hasNarrative = typeof v.rewrittenNarrative === "string";
  const hasChoiceResult = typeof v.rewrittenChoiceResult === "string";
  const toneOk = v.tone === undefined || typeof v.tone === "string";
  const styleOk = v.style === undefined || typeof v.style === "string";
  return hasNarrative && hasChoiceResult && toneOk && styleOk;
};
