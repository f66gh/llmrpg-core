export class StateStore<TState> {
  constructor(private state: TState) {}

  getState() {
    return this.state;
  }

  setState(next: TState | ((prev: TState) => TState)) {
    this.state =
      typeof next === "function" ? (next as (prev: TState) => TState)(this.state) : next;
    return this.state;
  }
}
