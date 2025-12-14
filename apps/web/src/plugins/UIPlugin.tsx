import type { GameState } from "@llmrpg/core";
import type { ReactElement } from "react";

export interface UIPlugin {
  id: string;
  render(state: GameState): ReactElement | null;
}
