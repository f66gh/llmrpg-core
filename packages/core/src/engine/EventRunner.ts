import { StateStore } from "./StateStore";

export type Event<TState> = (state: TState, store: StateStore<TState>) => void;

export class EventRunner<TState> {
  constructor(private queue: Event<TState>[] = []) {}

  enqueue(event: Event<TState>) {
    this.queue.push(event);
  }

  flush(store: StateStore<TState>) {
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (event) {
        event(store.getState(), store);
      }
    }
  }
}
