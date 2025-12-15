import type { Effect, GameState, PlayerAction, StepHook } from "@llmrpg/core";

export const createEventLogHook = (): StepHook => {
  return (state: GameState, action: PlayerAction): Effect[] => {
    const entry = [
      `action:${action.id}`,
      `event:${state.flags.__lastEventId ?? "none"}`,
      `pending:${state.flags.__pendingEventId ?? "none"}`,
      `money:${state.meters.money ?? 0}`,
      `energy:${state.meters.energy ?? 0}`,
      `stress:${state.meters.stress ?? 0}`,
      `slot:${state.time.slot}`,
      `day:${state.time.day}`
    ].join(" | ");

    return [{ op: "pushLog", entry }];
  };
};
