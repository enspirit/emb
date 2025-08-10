import deepMerge from '@fastify/deepmerge';

import {
  ComponentConfig,
  DefaultSettings,
  FlavorConfig,
  IMonorepoConfig,
  IProjectConfig,
  PluginConfig,
} from '@/config';
import { Task } from '@/config/schema.js';
import { deepMergeArray } from '@/utils';

export class MonorepoConfig implements IMonorepoConfig {
  // the flavor we come from
  currentFlavor: string;
  //
  defaults: DefaultSettings;
  env: Record<string, string>;
  flavors: Array<FlavorConfig>;
  plugins: Array<PluginConfig>;
  project: IProjectConfig;
  vars: Record<string, unknown>;
  tasks: Array<Task>;
  private _components: Map<string, ComponentConfig>;

  constructor(config: IMonorepoConfig) {
    this._components = config.components.reduce<Map<string, ComponentConfig>>(
      (map, cmp) => {
        map.set(cmp.name, cmp);

        return map;
      },
      new Map(),
    );
    this.defaults = config.defaults || {};
    this.project = config.project;
    this.vars = config.vars || {};
    this.flavors = config.flavors || [];
    this.env = config.env || {};
    this.plugins = config.plugins || [];
    this.tasks = config.tasks || [];
    this.currentFlavor = config.currentFlavor || 'default';
  }

  get components() {
    return [...this._components.values()];
  }

  component(name: string): ComponentConfig {
    const config = this.components.find((c) => c.name === name);

    if (!config) {
      throw new Error(`Unknown component ${name}`);
    }

    return config;
  }

  flavor(name: string): FlavorConfig {
    const flavor = this.flavors.find((f) => f.name === name);

    if (!flavor) {
      throw new Error(`Unknown flavor: ${name}`);
    }

    return flavor;
  }

  toJSON(): IMonorepoConfig {
    return {
      currentFlavor: this.currentFlavor,
      components: this.components,
      defaults: this.defaults,
      env: this.env,
      flavors: this.flavors,
      plugins: this.plugins,
      project: this.project,
      vars: this.vars,
      tasks: this.tasks,
    };
  }

  with(overrides: Partial<IMonorepoConfig>): MonorepoConfig {
    const newConfig: IMonorepoConfig = {
      ...this.toJSON(),
      ...overrides,
      components: deepMerge({
        mergeArray() {
          // Merge components by identifying them by name
          return (target, source) =>
            deepMergeArray(target, source, (item) => {
              return item.name;
            });
        },
      })(this.components, overrides?.components || []),
      defaults: deepMerge()(this.defaults || {}, overrides.defaults || {}),
      env: deepMerge()(this.env, overrides?.env || {}),
      project: deepMerge()(this.project, overrides?.project || {}),
      vars: deepMerge()(this.vars, overrides?.vars || {}),
    };

    return new MonorepoConfig(newConfig);
  }

  withFlavor(name: string): MonorepoConfig {
    return this.with({
      ...this.flavor(name),
      currentFlavor: name,
    });
  }
}
