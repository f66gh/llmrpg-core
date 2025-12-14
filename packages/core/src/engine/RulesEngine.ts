export type Rule<TState> = (state: TState) => TState;

export class RulesEngine<TState> {
  constructor(private rules: Rule<TState>[] = []) {}

  register(rule: Rule<TState>) {
    this.rules.push(rule);
  }

  apply(state: TState) {
    return this.rules.reduce((current, rule) => rule(current), state);
  }
}
