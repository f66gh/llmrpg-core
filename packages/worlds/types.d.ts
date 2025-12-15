declare module "@llmrpg/worlds/sandbox/world.json" {
  const value: any;
  export default value;
}

declare module "@llmrpg/worlds/sandbox" {
  import type { EventDef, StepHook } from "@llmrpg/core";
  export const events: EventDef[];
  export const sandboxPlugins: {
    beforeStep?: StepHook[];
    afterStep?: StepHook[];
  };
}

declare module "@llmrpg/worlds/sandbox/events" {
  const value: any;
  export default value;
}

declare module "@llmrpg/worlds/starfall-city/world.json" {
  const value: any;
  export default value;
}

declare module "@llmrpg/worlds/starfall-city/events.json" {
  const value: any;
  export default value;
}
