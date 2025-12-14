export type Patch<TState> = Partial<TState>;

export function applyPatch<TState>(target: TState, patch: Patch<TState>): TState {
  return { ...target, ...patch };
}
