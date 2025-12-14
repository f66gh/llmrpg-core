import type { GameState } from "../schema/game";

type DigestOptions = {
  maxMeters?: number;
  maxTags?: number;
  maxLogLines?: number;
};

export function buildStateDigest(
  state: GameState,
  opts: DigestOptions = {}
): {
  meta: Pick<GameState["meta"], "turn" | "phase" | "seed">;
  time: GameState["time"];
  location: GameState["location"];
  meters: Record<string, number>;
  tags: string[];
  log: string[];
  inventoryCount: number;
} {
  const {
    maxMeters = 12,
    maxTags = 20,
    maxLogLines = 6
  } = opts;

  const meterKeys = Object.keys(state.meters).sort();
  const meters: Record<string, number> = {};
  for (const key of meterKeys.slice(0, maxMeters)) {
    const value = state.meters[key];
    if (typeof value === "number") {
      meters[key] = value;
    }
  }

  const tags = state.tags.slice(0, maxTags);
  const log = state.log.slice(-maxLogLines);

  return {
    meta: {
      turn: state.meta.turn,
      phase: state.meta.phase,
      seed: state.meta.seed
    },
    time: { ...state.time },
    location: { ...state.location },
    meters,
    tags,
    log,
    inventoryCount: state.inventory.length
  };
}
