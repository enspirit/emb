import { IEMBPlugin } from './types.js';

export * from './ComponentsDiscover.js';
export * from './DotEnvPlugin.js';

import { ComponentDiscoverPlugin } from './ComponentsDiscover.js';
import { DotEnvPluging } from './DotEnvPlugin.js';

const PluginRegistry = new Map<string, IEMBPlugin>();

export const registerPlugin = (plugin: IEMBPlugin) => {
  if (PluginRegistry.has(plugin.name)) {
    throw new Error(`Plugin name confict: '${plugin.name}' already registered`);
  }

  PluginRegistry.set(plugin.name, plugin);
};

export const getPlugin = (name: string) => {
  if (!PluginRegistry.has(name)) {
    throw new Error(`Unknown plugin: ${name}`);
  }

  return PluginRegistry.get(name) as IEMBPlugin;
};

registerPlugin(new ComponentDiscoverPlugin());
registerPlugin(new DotEnvPluging());
