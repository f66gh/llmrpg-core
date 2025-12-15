import type { GameState } from "../schema/game";
import { ensureMemory } from "../schema/game";
import type { SaveSlot } from "./SaveSystem";
import { SaveSystem } from "./SaveSystem";

export class LocalStorageSaveSystem extends SaveSystem<GameState> {
  constructor(private readonly keyPrefix = "llmrpg") {
    super();
  }

  private key(slotId: string) {
    return `${this.keyPrefix}:${slotId}`;
  }

  async save(slot: SaveSlot<GameState>): Promise<void> {
    try {
      const serialized = JSON.stringify(slot.state);
      localStorage.setItem(this.key(slot.id), serialized);
    } catch (err) {
      if (err instanceof DOMException && err.name === "QuotaExceededError") {
        console.warn("LocalStorageSaveSystem.save failed: quota exceeded", err);
      } else {
        console.warn("LocalStorageSaveSystem.save failed", err);
      }
      throw err;
    }
  }

  async load(id: string): Promise<GameState | null> {
    try {
      const raw = localStorage.getItem(this.key(id));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GameState;
      return ensureMemory(parsed);
    } catch (err) {
      console.warn("LocalStorageSaveSystem.load failed", err);
      throw err;
    }
  }

  async list(): Promise<SaveSlot<GameState>[]> {
    const slots: SaveSlot<GameState>[] = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(`${this.keyPrefix}:`)) continue;
        const id = key.slice(this.keyPrefix.length + 1);
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as GameState;
          slots.push({ id, state: ensureMemory(parsed) });
        } catch (err) {
          console.warn("LocalStorageSaveSystem.list parse failed", err);
        }
      }
    } catch (err) {
      console.warn("LocalStorageSaveSystem.list failed", err);
    }
    return slots;
  }
}
