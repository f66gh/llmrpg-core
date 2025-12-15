import type { Effect } from "./effects";

export type EventCondition = {
  phaseIn?: string[];
  timeSlotIn?: string[];
  locationZoneIn?: string[];
  locationPlaceIn?: string[];
  meterGte?: Array<{ key: string; value: number }>;
  meterLte?: Array<{ key: string; value: number }>;
  hasTags?: string[];
  lacksTags?: string[];
};

export type EventChoiceDef = {
  id: "A" | "B" | "C" | "D";
  text: string;
  effects: Effect[];
};

export type EventDef = {
  id: string;
  title?: string;
  when?: EventCondition;
  narrative: string;
  choices?: EventChoiceDef[];
  weight?: number;
  promptSeed?: string;
  actionHints?: string[];
  effectBudget?: number;
};
