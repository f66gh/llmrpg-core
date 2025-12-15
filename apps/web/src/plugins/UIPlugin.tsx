import type { GameState, StepResult } from "@llmrpg/core";
import type { ReactElement } from "react";

export interface UIPlugin {
  id: string;
  render(state: GameState, stepResult?: StepResult): ReactElement | null;
}
