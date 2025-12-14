import type { GameState } from "../schema/game";

type StatePlugin = {
  apply(state: GameState): GameState;
};

export class PluginManager {
  private plugins: StatePlugin[] = [];

  registerPlugin(plugin: StatePlugin) {
    this.plugins.push(plugin);
  }

  applyPlugins(state: GameState): GameState {
    return this.plugins.reduce((current, plugin) => plugin.apply(current), state);
  }
}
