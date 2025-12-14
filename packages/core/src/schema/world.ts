export type EventDef = {
  id: string;
  description: string;
  conditions?: string[];
  effects?: string[];
};

export type WorldPack = {
  id: string;
  name: string;
  summary?: string;
  events: EventDef[];
};
