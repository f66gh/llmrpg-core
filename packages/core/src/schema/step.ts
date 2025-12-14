import type { Effect } from "./effects";
import type { GameState } from "./game";

export type ChoiceId = "A" | "B" | "C" | "D";

export type PlayerAction = {
  type: "choice";
  id: ChoiceId;
};

export type Choice = {
  id: ChoiceId;
  text: string;
};

export type StepResult = {
  state: GameState;
  narrative: string;
  choices: Choice[];
  applied: Effect[];
  warnings: string[];
};
