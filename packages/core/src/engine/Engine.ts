import { EventRunner } from "./EventRunner";
import { RulesEngine } from "./RulesEngine";
import { StateStore } from "./StateStore";

export class Engine<TState> {
  constructor(
    private readonly store: StateStore<TState>,
    private readonly rules: RulesEngine<TState>,
    private readonly events: EventRunner<TState>
  ) {}

  tick() {
    const state = this.store.getState();
    const updated = this.rules.apply(state);
    this.store.setState(updated);
    this.events.flush(this.store);
    return this.store.getState();
  }

  /** Demo factory: minimal engine for quick UI bootstrapping */
  static createDemo<TState extends Record<string, unknown>>(
    initialState: TState
  ) {
    const store = new StateStore<TState>(initialState);
    const rules = new RulesEngine<TState>();
    const events = new EventRunner<TState>();
    return new Engine<TState>(store, rules, events);
  }
}
