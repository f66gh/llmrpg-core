import { SaveSlot, SaveSystem } from "../SaveSystem";

export class BrowserSaveSystem<TState> extends SaveSystem<TState> {
  constructor(private readonly keyPrefix = "llmrpg") {
    super();
  }

  async save(slot: SaveSlot<TState>) {
    const serialized = JSON.stringify(slot.state);
    localStorage.setItem(`${this.keyPrefix}:${slot.id}`, serialized);
  }

  async load(id: string) {
    const raw = localStorage.getItem(`${this.keyPrefix}:${id}`);
    return raw ? (JSON.parse(raw) as TState) : null;
  }

  async list() {
    const slots: SaveSlot<TState>[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${this.keyPrefix}:`)) {
        const id = key.replace(`${this.keyPrefix}:`, "");
        const state = localStorage.getItem(key);
        if (state) {
          slots.push({ id, state: JSON.parse(state) as TState });
        }
      }
    }
    return slots;
  }
}
