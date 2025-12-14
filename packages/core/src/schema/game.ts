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
};

export const createDefaultGameState = (): GameState => ({
  meta: { version: "0.1.0", seed: 0, phase: "story", turn: 0 },
  time: { day: 1, slot: "morning" },
  location: { zone: "start", place: "start" },
  meters: {},
  tags: [],
  inventory: [],
  flags: {},
  log: []
});