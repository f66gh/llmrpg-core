import type { Effect } from "../schema/effects";

export type AdHocChoice = {
  id: string;
  text: string;
  effects?: Effect[];
};

export type AdHocEvent = {
  id: string;
  title: string;
  narrative: string;
  choices: AdHocChoice[];
  effects?: Effect[];
  maxDelta?: number; // optional guard: clamp inc amount
};

const ALLOWED_OPS: Effect["op"][] = ["inc", "set", "addTag", "removeTag", "pushLog", "moveLocation"];

export function validateAndSanitizeAdHocEvent(input: unknown): { event: AdHocEvent; warnings: string[] } {
  const warnings: string[] = [];
  const base: Partial<AdHocEvent> = {};

  if (typeof (input as any)?.id === "string") base.id = (input as any).id;
  else {
    base.id = `llm:${Date.now()}`;
    warnings.push("missing-id");
  }

  if (typeof (input as any)?.title === "string") base.title = (input as any).title;
  else {
    base.title = "LLM 事件";
    warnings.push("missing-title");
  }

  if (typeof (input as any)?.narrative === "string") base.narrative = (input as any).narrative;
  else {
    base.narrative = "（无叙事）";
    warnings.push("missing-narrative");
  }

  const maxDelta = typeof (input as any)?.maxDelta === "number" ? Math.abs((input as any).maxDelta) : undefined;
  base.maxDelta = maxDelta;

  const sanitizeEffects = (effs: unknown): Effect[] => {
    if (!Array.isArray(effs)) return [];
    const out: Effect[] = [];
    for (const e of effs) {
      if (!e || typeof e !== "object") continue;
      const op = (e as any).op;
      if (!ALLOWED_OPS.includes(op)) {
        warnings.push(`illegal-op-${op}`);
        continue;
      }
      switch (op) {
        case "inc": {
          const path = (e as any).path;
          let amount = (e as any).amount;
          if (typeof path !== "string" || typeof amount !== "number") {
            warnings.push("invalid-inc");
            continue;
          }
          if (maxDelta !== undefined) {
            if (amount > maxDelta) {
              amount = maxDelta;
              warnings.push("clamp-inc");
            } else if (amount < -maxDelta) {
              amount = -maxDelta;
              warnings.push("clamp-inc");
            }
          }
          out.push({ op: "inc", path, amount });
          break;
        }
        case "set": {
          const path = (e as any).path;
          const value = (e as any).value;
          if (typeof path !== "string") {
            warnings.push("invalid-set");
            continue;
          }
          out.push({ op: "set", path, value });
          break;
        }
        case "addTag": {
          const tag = (e as any).tag;
          if (typeof tag !== "string") {
            warnings.push("invalid-addTag");
            continue;
          }
          out.push({ op: "addTag", tag });
          break;
        }
        case "removeTag": {
          const tag = (e as any).tag;
          if (typeof tag !== "string") {
            warnings.push("invalid-removeTag");
            continue;
          }
          out.push({ op: "removeTag", tag });
          break;
        }
        case "pushLog": {
          const entry = (e as any).entry;
          if (typeof entry !== "string") {
            warnings.push("invalid-pushLog");
            continue;
          }
          out.push({ op: "pushLog", entry });
          break;
        }
        case "moveLocation": {
          const zone = (e as any).zone;
          const place = (e as any).place;
          if (typeof zone !== "string" || typeof place !== "string") {
            warnings.push("invalid-moveLocation");
            continue;
          }
          out.push({ op: "moveLocation", zone, place });
          break;
        }
        default:
          warnings.push(`unknown-op-${op}`);
      }
    }
    return out;
  };

  const sanitizeChoices = (choices: unknown): AdHocChoice[] => {
    if (!Array.isArray(choices)) return [];
    const out: AdHocChoice[] = [];
    for (const c of choices) {
      if (!c || typeof c !== "object") continue;
      const id = (c as any).id;
      const text = (c as any).text;
      if (typeof id !== "string" || typeof text !== "string") {
        warnings.push("invalid-choice");
        continue;
      }
      const ceffects = sanitizeEffects((c as any).effects);
      out.push({ id, text, effects: ceffects });
    }
    return out;
  };

  const choices = sanitizeChoices((input as any)?.choices);
  base.choices = choices.length > 0 ? choices : [
    {
      id: "A",
      text: "继续",
      effects: [{ op: "pushLog", entry: "默认选项" }]
    }
  ];

  base.effects = sanitizeEffects((input as any)?.effects);

  const event: AdHocEvent = {
    id: base.id!,
    title: base.title!,
    narrative: base.narrative!,
    choices: base.choices!,
    effects: base.effects,
    maxDelta: base.maxDelta
  };

  return { event, warnings };
}
