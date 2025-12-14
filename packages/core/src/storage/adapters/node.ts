import { promises as fs } from "fs";
import path from "path";
import { SaveSlot, SaveSystem } from "../SaveSystem";

export class NodeSaveSystem<TState> extends SaveSystem<TState> {
  constructor(private readonly dir: string) {
    super();
  }

  private filePath(id: string) {
    return path.join(this.dir, `${id}.json`);
  }

  async save(slot: SaveSlot<TState>) {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.filePath(slot.id), JSON.stringify(slot.state, null, 2));
  }

  async load(id: string) {
    try {
      const data = await fs.readFile(this.filePath(id), "utf-8");
      return JSON.parse(data) as TState;
    } catch {
      return null;
    }
  }

  async list() {
    try {
      const files = await fs.readdir(this.dir);
      const jsonFiles = files.filter((file: string) => file.endsWith(".json"));

      const slots = await Promise.all(
        jsonFiles.map(async (file: string) => {
          const data = await fs.readFile(path.join(this.dir, file), "utf-8");
          return {
            id: path.basename(file, ".json"),
            state: JSON.parse(data) as TState
          };
        })
      );

      return slots;
    } catch {
      return [];
    }
  }
}
