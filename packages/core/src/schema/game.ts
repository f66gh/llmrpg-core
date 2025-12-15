export type GameState = {
  meta: {
    version: string;
    seed: number;
    phase: string;
    turn: number;
  };
  time: {
    day: number;
    slot: string;
  };
  location: {
    zone: string;
    place: string;
  };
  meters: Record<string, number>;
  tags: string[];
  inventory: unknown[];
  flags: Record<string, boolean | number | string>;
  log: string[];
  memory?: {
    summary: string;
    recentTurns: Array<{
      turn: number;
      time: { day: number; slot: string };
      location: { zone: string; place: string };
      eventId?: string;
      moveId?: string;
      choiceId?: string;
      brief: string;
      effects?: string;
    }>;
  };
};

export type MemoryState = NonNullable<GameState["memory"]>;
export type RecentTurnEntry = MemoryState["recentTurns"][number];

export const createDefaultGameState = (): GameState => ({
  meta: { version: "0.1.0", seed: 0, phase: "story", turn: 0 },
  time: { day: 1, slot: "morning" },
  location: { zone: "start", place: "start" },
  meters: {},
  tags: [],
  inventory: [],
  flags: {},
  log: [],
  memory: {
    summary: "",
    recentTurns: []
  }
});

export function ensureMemory(state: GameState): GameState {
  if (state.memory && Array.isArray(state.memory.recentTurns) && typeof state.memory.summary === "string") {
    return state;
  }
  return {
    ...state,
    memory: {
      summary: state.memory?.summary ?? "",
      recentTurns: Array.isArray(state.memory?.recentTurns) ? state.memory!.recentTurns : []
    }
  };
}

export function appendRecentTurn(state: GameState, entry: RecentTurnEntry, maxK = 20): GameState {
  const base = ensureMemory(state);
  const nextRecent = [...base.memory!.recentTurns, entry].slice(-Math.max(1, maxK));
  return {
    ...state,
    memory: {
      summary: base.memory?.summary ?? "",
      recentTurns: nextRecent
    }
  };
}
