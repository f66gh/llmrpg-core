import type { GameState } from "../schema/game";
import { EventPlugin } from "./EventPlugin";
import type { StateStore } from "../engine/StateStore";

export class TimeBasedEventPlugin implements EventPlugin<GameState> {
  private fired = false;

  constructor(
    private readonly targetDay: number,
    private readonly targetSlot: string,
    private readonly logEntry = "Time-based event triggered"
  ) {}

  shouldTrigger(state: GameState): boolean {
    return (
      !this.fired &&
      state.time.day >= this.targetDay &&
      state.time.slot === this.targetSlot
    );
  }

  apply(state: GameState, store: StateStore<GameState>): void {
    if (!this.shouldTrigger(state)) return;
    this.fired = true;
    store.setState((prev) => ({
      ...prev,
      log: [...prev.log, this.logEntry]
    }));
  }
}
