import type { Effect } from "../schema/effects";
import type { GameState } from "../schema/game";
import type { Choice, PlayerAction, StepResult } from "../schema/step";
import { applyEffects } from "./applyEffects";
import { EventRunner } from "./EventRunner";
import { RulesEngine } from "./RulesEngine";
import { StateStore } from "./StateStore";

export class Engine {
  constructor(
    private readonly store: StateStore<GameState>,
    private readonly rules: RulesEngine<GameState>,
    private readonly events: EventRunner<GameState>
  ) {}

  tick() {
    const state = this.store.getState();
    const updated = this.rules.apply(state);
    this.store.setState(updated);
    this.events.flush(this.store);
    return this.store.getState();
  }

  step(action: PlayerAction): StepResult {
    const current = this.store.getState();

    const effects: Effect[] = [
      { op: "set", path: "meta.turn", value: current.meta.turn + 1 },
      { op: "pushLog", entry: `You chose ${action.id}` }
    ];

    const { state: nextState, warnings } = applyEffects(current, effects);
    this.store.setState(nextState);

    const choices: Choice[] = [
      { id: "A", text: "Choice A" },
      { id: "B", text: "Choice B" },
      { id: "C", text: "Choice C" },
      { id: "D", text: "Choice D" }
    ];

    return {
      state: nextState,
      narrative: `Action ${action.id} processed.`,
      choices,
      applied: effects,
      warnings
    };
  }

  /** Demo factory: minimal engine for quick UI bootstrapping */
  static createDemo(initialState: GameState) {
    const store = new StateStore<GameState>(initialState);
    const rules = new RulesEngine<GameState>();
    const events = new EventRunner<GameState>();
    return new Engine(store, rules, events);
  }
}
