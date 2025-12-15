import type { Effect, GameState, PlayerAction, StepHook } from "@llmrpg/core";

export type EconomyDailyTickOptions = {
  dailyCost?: number;
  wrapSlot?: { from: string; to: string };
};

export const createEconomyDailyTickHook = (
  opts: EconomyDailyTickOptions = {}
): StepHook => {
  const dailyCost = opts.dailyCost ?? 1;
  const wrapSlot = opts.wrapSlot ?? { from: "night", to: "morning" };

  return (state: GameState, _action: PlayerAction): Effect[] => {
    const prev = state.flags.__slotPrev;
    const now = state.time.slot;
    const effects: Effect[] = [];

    if (prev === wrapSlot.from && now === wrapSlot.to) {
      effects.push({ op: "inc", path: "meters.money", amount: -dailyCost });
      effects.push({ op: "inc", path: "meters.stress", amount: 1 });
      effects.push({
        op: "pushLog",
        entry: `Daily cost ${-dailyCost >= 0 ? "-" : ""}${dailyCost}`
      });

      const projectedMoney = (state.meters.money ?? 0) - dailyCost;
      if (projectedMoney < 0) {
        effects.push({ op: "pushLog", entry: "money below zero after daily cost" });
        effects.push({ op: "set", path: "flags.econ_debt", value: true });
      }
    }

    return effects;
  };
};
