import type { Effect, GameState, PlayerAction, StepHook } from "@llmrpg/core";

const ORDERED_SLOTS = ["morning", "afternoon", "evening", "night"];

export const createTurnIncrementHook = (): StepHook => {
  return (state: GameState, _action: PlayerAction): Effect[] => {
    const currentSlot = state.time.slot;
    const idx = ORDERED_SLOTS.indexOf(currentSlot);
    const nextIdx = idx >= 0 ? (idx + 1) % ORDERED_SLOTS.length : 0;
    const nextSlot = ORDERED_SLOTS[nextIdx];
    const wrapped = idx >= 0 && nextIdx === 0;

    const effects: Effect[] = [
      { op: "set", path: "flags.__slotPrev", value: currentSlot },
      { op: "set", path: "time.slot", value: nextSlot }
    ];

    if (wrapped) {
      effects.push({ op: "set", path: "time.day", value: state.time.day + 1 });
    }

    return effects;
  };
};
