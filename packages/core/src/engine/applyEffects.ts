import type { Effect } from "../schema/effects";
import type { GameState } from "../schema/game";

type ApplyResult = {
  state: GameState;
  warnings: string[];
};

const SET_PATHS = new Set([
  "meta.phase",
  "meta.turn",
  "time.day",
  "time.slot",
  "location.zone",
  "location.place"
]);

const startsWithMeters = (path: string) => path.startsWith("meters.");
const startsWithFlags = (path: string) => path.startsWith("flags.");

export function applyEffects(state: GameState, effects: Effect[]): ApplyResult {
  let next: GameState = {
    ...state,
    meta: { ...state.meta },
    time: { ...state.time },
    location: { ...state.location },
    meters: { ...state.meters },
    tags: [...state.tags],
    inventory: [...state.inventory],
    flags: { ...state.flags },
    log: [...state.log]
  };

  const warnings: string[] = [];

  for (const effect of effects) {
    switch (effect.op) {
      case "inc": {
        if (!startsWithMeters(effect.path)) {
          warnings.push(`inc: unsupported path ${effect.path}`);
          break;
        }
        const key = effect.path.split(".")[1];
        const current = next.meters[key];
        if (typeof current !== "number") {
          warnings.push(`inc: meter ${key} is not a number`);
          break;
        }
        next = {
          ...next,
          meters: { ...next.meters, [key]: current + effect.amount }
        };
        break;
      }
      case "set": {
        if (SET_PATHS.has(effect.path)) {
          next = applySetKnownPath(next, effect.path, effect.value, warnings);
        } else if (startsWithFlags(effect.path)) {
          const flagKey = effect.path.split(".")[1];
          if (
            typeof effect.value === "string" ||
            typeof effect.value === "number" ||
            typeof effect.value === "boolean"
          ) {
            next = {
              ...next,
              flags: { ...next.flags, [flagKey]: effect.value }
            };
          } else {
            warnings.push(`set: flag ${flagKey} type mismatch`);
          }
        } else if (startsWithMeters(effect.path)) {
          const meterKey = effect.path.split(".")[1];
          if (typeof effect.value === "number") {
            next = {
              ...next,
              meters: { ...next.meters, [meterKey]: effect.value }
            };
          } else {
            warnings.push(`set: meter ${meterKey} type mismatch`);
          }
        } else {
          warnings.push(`set: unsupported path ${effect.path}`);
        }
        break;
      }
      case "addTag": {
        if (!next.tags.includes(effect.tag)) {
          next = { ...next, tags: [...next.tags, effect.tag] };
        }
        break;
      }
      case "removeTag": {
        if (next.tags.includes(effect.tag)) {
          next = { ...next, tags: next.tags.filter((tag) => tag !== effect.tag) };
        }
        break;
      }
      case "pushLog": {
        next = { ...next, log: [...next.log, effect.entry] };
        break;
      }
      case "moveLocation": {
        next = {
          ...next,
          location: { ...next.location, zone: effect.zone, place: effect.place }
        };
        break;
      }
      default: {
        warnings.push(`unknown effect ${(effect as { op: string }).op}`);
      }
    }
  }

  return { state: next, warnings };
}

function applySetKnownPath(
  state: GameState,
  path: string,
  value: unknown,
  warnings: string[]
): GameState {
  switch (path) {
    case "meta.phase":
      if (typeof value === "string") {
        return { ...state, meta: { ...state.meta, phase: value } };
      }
      warnings.push("set: meta.phase type mismatch");
      return state;
    case "meta.turn":
      if (typeof value === "number") {
        return { ...state, meta: { ...state.meta, turn: value } };
      }
      warnings.push("set: meta.turn type mismatch");
      return state;
    case "time.day":
      if (typeof value === "number") {
        return { ...state, time: { ...state.time, day: value } };
      }
      warnings.push("set: time.day type mismatch");
      return state;
    case "time.slot":
      if (typeof value === "string") {
        return { ...state, time: { ...state.time, slot: value } };
      }
      warnings.push("set: time.slot type mismatch");
      return state;
    case "location.zone":
      if (typeof value === "string") {
        return { ...state, location: { ...state.location, zone: value } };
      }
      warnings.push("set: location.zone type mismatch");
      return state;
    case "location.place":
      if (typeof value === "string") {
        return { ...state, location: { ...state.location, place: value } };
      }
      warnings.push("set: location.place type mismatch");
      return state;
    default:
      warnings.push(`set: unsupported path ${path}`);
      return state;
  }
}
