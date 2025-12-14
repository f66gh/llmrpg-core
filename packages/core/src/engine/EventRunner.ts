import { EventPlugin } from "../plugins/EventPlugin";
import { StateStore } from "./StateStore";

export type Event<TState> = (state: TState, store: StateStore<TState>) => void;

export class EventRunner<TState> {
  constructor(
    private queue: Event<TState>[] = [],
    private plugins: EventPlugin<TState>[] = []
  ) {}

  registerPlugin(plugin: EventPlugin<TState>) {
    this.plugins.push(plugin);
  }

  enqueue(event: Event<TState>) {
    this.queue.push(event);
  }

  flush(store: StateStore<TState>) {
    // First evaluate plugins deterministically against current state.
    let currentState = store.getState();
    for (const plugin of this.plugins) {
      if (plugin.shouldTrigger(currentState)) {
        plugin.apply(currentState, store);
        currentState = store.getState();
      }
    }

    // Then run queued events.
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (event) {
        event(store.getState(), store);
      }
    }
  }
}
