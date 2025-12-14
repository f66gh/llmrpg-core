export class PluginRegistry<TPlugin> {
  private readonly registry = new Map<string, TPlugin>();

  register(name: string, plugin: TPlugin) {
    this.registry.set(name, plugin);
  }

  get(name: string) {
    return this.registry.get(name);
  }

  list() {
    return Array.from(this.registry.entries());
  }
}
