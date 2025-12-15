import type { EventDef, GameState, StepHook } from "@llmrpg/core";

import sandboxEvents from "@llmrpg/worlds/sandbox/events";
import sandboxWorld from "@llmrpg/worlds/sandbox/world.json";
import { sandboxPlugins } from "@llmrpg/worlds/sandbox";
import type { UIPlugin } from "../plugins";
import { DebugHUDPlugin, ScoreBoardPlugin } from "../plugins";

type WorldJson = {
  id: string;
  name: string;
  summary?: string;
  events: string[];
  initialState: GameState;
};

export type LoadedWorld = {
  id: string;
  world: WorldJson;
  events: EventDef[];
  hooks?: {
    beforeStep?: StepHook[];
    afterStep?: StepHook[];
  };
  uiPlugins?: UIPlugin[];
};

export function loadWorld(worldId: string): LoadedWorld {
  switch (worldId) {
    case "sandbox":
      return {
        id: "sandbox",
        world: sandboxWorld as WorldJson,
        events: sandboxEvents as EventDef[],
        hooks: {
          beforeStep: sandboxPlugins.beforeStep,
          afterStep: sandboxPlugins.afterStep
        },
        uiPlugins: [ScoreBoardPlugin, DebugHUDPlugin]
      };
    default:
      throw new Error(`World not found: ${worldId}`);
  }
}
