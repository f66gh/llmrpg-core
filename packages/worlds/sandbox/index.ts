import { createEconomyDailyTickHook, createEventLogHook, createTurnIncrementHook } from "./plugins";
import sandboxEvents from "./events";
import type { EventDef, StepHook } from "@llmrpg/core";

export type SandboxPluginBundle = {
  beforeStep?: StepHook[];
  afterStep?: StepHook[];
};

export const events: EventDef[] = sandboxEvents;

export const sandboxPlugins: SandboxPluginBundle = {
  beforeStep: [],
  afterStep: [createTurnIncrementHook(), createEconomyDailyTickHook(), createEventLogHook()]
};
