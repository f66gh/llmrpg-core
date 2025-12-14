import type { GameState } from "@llmrpg/core";
import { PluginManager } from "@llmrpg/core";
import type { UIPlugin } from "./UIPlugin";
import { ScoreBoardPlugin } from "./ScoreBoardPlugin";
import { TurnIncrementPlugin } from "../../worlds/starfall-city/plugins/TurnIncrementPlugin";
import { LogEventPlugin } from "../../worlds/starfall-city/plugins/LogEventPlugin";
import { HealthBarPlugin as WorldHealthBarPlugin } from "../../worlds/starfall-city/plugins/HealthBarPlugin";

export function createAppPluginManager() {
  const mgr = new PluginManager();
  mgr.registerPlugin(new TurnIncrementPlugin());
  mgr.registerPlugin(new LogEventPlugin("Event plugin applied"));
  return mgr;
}

export function getUiPlugins(): UIPlugin[] {
  return [WorldHealthBarPlugin, ScoreBoardPlugin];
}

export type StatePlugin = {
  apply(state: GameState): GameState;
};
