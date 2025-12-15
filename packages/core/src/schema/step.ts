import type { Effect } from "./effects";
import type { GameState } from "./game";

export type ChoiceId = "A" | "B" | "C" | "D";

export type PlayerAction =
  | { type: "choice"; id: ChoiceId }
  | { type: "move"; id: string; text?: string };

export type Choice = {
  id: ChoiceId;
  text: string;
};

export type Move = {
  id: string;
  text: string;
  hint?: string;
};

export type StepResult = {
  state: GameState;
  narrative: string;
  storyText?: string;
  rawEventNarrative?: string;
  choices: Choice[];
  nextMoves?: Move[];
  moveSource?: "static" | "llm" | "mixed";
  llmProposedEffects?: Effect[];
  acceptedEffects?: Effect[];
  rejectedEffects?: Array<{ effect: Effect; reason: string }>;
  applied: Effect[];
  warnings: string[];
  debug?: string[];
};
