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
