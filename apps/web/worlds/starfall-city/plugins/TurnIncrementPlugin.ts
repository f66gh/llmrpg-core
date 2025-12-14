import type { GameState } from "@llmrpg/core";

export class TurnIncrementPlugin {
  apply(state: GameState): GameState {
    return {
      ...state,
      meta: { ...state.meta, turn: state.meta.turn + 1 }
    };
  }
}
