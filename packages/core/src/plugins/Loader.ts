import type { PluginManifest } from "./Manifest";

export type PluginFactory<TPlugin> = (manifest: PluginManifest) => TPlugin;

export function loadPlugin<TPlugin>(
  manifest: PluginManifest,
  factory: PluginFactory<TPlugin>
) {
  return factory(manifest);
}
