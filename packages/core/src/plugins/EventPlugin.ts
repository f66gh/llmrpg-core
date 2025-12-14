import type { GameState } from "../schema/game";
import type { StateStore } from "../engine/StateStore";

export interface EventPlugin<TState = GameState> {
  shouldTrigger(state: TState): boolean;
  apply(state: TState, store: StateStore<TState>): void;
}
