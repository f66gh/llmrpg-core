import type { GameState } from "@llmrpg/core";

export class LogEventPlugin {
  constructor(private readonly message = "Event plugin applied") {}

  apply(state: GameState): GameState {
    return {
      ...state,
      log: [...state.log, this.message]
    };
  }
}
