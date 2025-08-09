import { AbstractPlugin } from './plugin.js';

export * from './ComponentDiscoverPlugin.js';
export * from './DotEnvPlugin.js';

import { Monorepo } from '@/monorepo';

import { ComponentDiscoverPlugin } from './ComponentDiscoverPlugin.js';
import { DotEnvPlugin } from './DotEnvPlugin.js';

export type AbstractPluginConstructor = new <C, P extends AbstractPlugin<C>>(
  config: C,
  monorepo: Monorepo,
) => P;

const PluginRegistry = new Map<string, AbstractPluginConstructor>();

export const registerPlugin = (plugin: AbstractPluginConstructor) => {
  if (PluginRegistry.has(plugin.name)) {
    throw new Error(`Plugin name confict: '${plugin.name}' already registered`);
  }

  PluginRegistry.set(plugin.name, plugin);
};

export const getPlugin = (name: string) => {
  if (!PluginRegistry.has(name)) {
    throw new Error(`Unknown plugin: ${name}`);
  }

  return PluginRegistry.get(name) as AbstractPluginConstructor;
};

/** Not sure why we need casting */
registerPlugin(ComponentDiscoverPlugin as AbstractPluginConstructor);
registerPlugin(DotEnvPlugin as AbstractPluginConstructor);
