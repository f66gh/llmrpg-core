export type SaveSlot<TState> = {
  id: string;
  state: TState;
};

export abstract class SaveSystem<TState> {
  abstract save(slot: SaveSlot<TState>): Promise<void>;
  abstract load(id: string): Promise<TState | null>;
  abstract list(): Promise<SaveSlot<TState>[]>;
}
