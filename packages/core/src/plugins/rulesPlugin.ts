import type { GameState } from "../schema/game";

export interface RulePlugin {
  apply(state: GameState): GameState;
}

export class RulesEngineInPlugin {
  private plugins: RulePlugin[] = [];

  registerPlugin(plugin: RulePlugin) {
    this.plugins.push(plugin);
  }

  apply(state: GameState): GameState {
    return this.plugins.reduce((current, plugin) => plugin.apply(current), state);
  }
}

// Simple example plugin: increments the turn counter by 1.
export class TurnIncrementPlugin implements RulePlugin {
  apply(state: GameState): GameState {
    return {
      ...state,
      meta: {
        ...state.meta,
        turn: state.meta.turn + 1
      }
    };
  }
}
