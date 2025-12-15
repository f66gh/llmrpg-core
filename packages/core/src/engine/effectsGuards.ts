import type { Effect } from "../schema/effects";

export type EffectGuardsConfig = {
  metersMaxDelta?: number; // clamp inc/set meters
};

export type GuardResult = {
  acceptedEffects: Effect[];
  rejectedEffects: Array<{ effect: Effect; reason: string }>;
};

const OP_WHITELIST: Effect["op"][] = ["inc", "set", "addTag", "removeTag", "pushLog", "moveLocation"];
const PATH_PREFIXES = ["meters.", "flags.", "tags", "log", "location."];

export function guardEffects(effects: Effect[] | undefined, cfg: EffectGuardsConfig = {}): GuardResult {
  const acceptedEffects: Effect[] = [];
  const rejectedEffects: Array<{ effect: Effect; reason: string }> = [];
  const maxDelta = cfg.metersMaxDelta;

  if (!effects || effects.length === 0) return { acceptedEffects, rejectedEffects };

  const isPathAllowed = (path: string) => PATH_PREFIXES.some((p) => path.startsWith(p));

  for (const eff of effects) {
    if (!eff || typeof eff !== "object" || !(eff as any).op) {
      rejectedEffects.push({ effect: eff as Effect, reason: "invalid-effect" });
      continue;
    }
    if (!OP_WHITELIST.includes(eff.op)) {
      rejectedEffects.push({ effect: eff, reason: "op-not-allowed" });
      continue;
    }
    switch (eff.op) {
      case "inc": {
        if (!isPathAllowed(eff.path)) {
          rejectedEffects.push({ effect: eff, reason: "path-not-allowed" });
          break;
        }
        let amt = eff.amount;
        if (typeof amt !== "number") {
          rejectedEffects.push({ effect: eff, reason: "amount-invalid" });
          break;
        }
        if (maxDelta !== undefined) {
          if (amt > maxDelta) {
            amt = maxDelta;
          } else if (amt < -maxDelta) {
            amt = -maxDelta;
          }
        }
        acceptedEffects.push({ ...eff, amount: amt });
        break;
      }
      case "set": {
        if (!isPathAllowed(eff.path)) {
          rejectedEffects.push({ effect: eff, reason: "path-not-allowed" });
          break;
        }
        acceptedEffects.push(eff);
        break;
      }
      case "addTag":
      case "removeTag":
      case "pushLog":
      case "moveLocation":
        acceptedEffects.push(eff);
        break;
      default:
        rejectedEffects.push({ effect: eff, reason: "unknown-op" });
    }
  }

  return { acceptedEffects, rejectedEffects };
}
