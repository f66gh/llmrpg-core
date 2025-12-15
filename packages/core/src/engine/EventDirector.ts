import type { Choice } from "../schema/step";
import type { EventDef } from "../schema/events";
import type { GameState } from "../schema/game";

export type EventDirectorConfig = {
  events: EventDef[];
};

export class EventDirector {
  constructor(private readonly cfg: EventDirectorConfig) {}

  getEventById(id: string): EventDef | null {
    return this.cfg.events.find((event) => event.id === id) ?? null;
  }

  pickEvent(state: GameState): EventDef | null {
    // Deterministic: return the first event that matches conditions.
    for (const event of this.cfg.events) {
      if (this.matches(event, state)) {
        return event;
      }
    }
    return null;
  }

  getChoices(event: EventDef): Choice[] {
    return event.choices.map((choice) => ({
      id: choice.id,
      text: choice.text
    }));
  }

  private matches(event: EventDef, state: GameState): boolean {
    const when = event.when;
    if (!when) return true;

    if (when.phaseIn && !when.phaseIn.includes(state.meta.phase)) return false;
    if (when.timeSlotIn && !when.timeSlotIn.includes(state.time.slot)) return false;
    if (when.locationZoneIn && !when.locationZoneIn.includes(state.location.zone))
      return false;
    if (when.locationPlaceIn && !when.locationPlaceIn.includes(state.location.place))
      return false;

    if (when.meterGte) {
      for (const { key, value } of when.meterGte) {
        const current = state.meters[key] ?? 0;
        if (current < value) return false;
      }
    }

    if (when.meterLte) {
      for (const { key, value } of when.meterLte) {
        const current = state.meters[key] ?? 0;
        if (current > value) return false;
      }
    }

    if (when.hasTags) {
      for (const tag of when.hasTags) {
        if (!state.tags.includes(tag)) return false;
      }
    }

    if (when.lacksTags) {
      for (const tag of when.lacksTags) {
        if (state.tags.includes(tag)) return false;
      }
    }

    return true;
  }
}
