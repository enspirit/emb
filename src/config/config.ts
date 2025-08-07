import deepMerge from '@fastify/deepmerge';

import { deepMergeArray } from '../utils/deepMergeArray.js';
import {
  ComponentConfig,
  DefaultSettings,
  FlavorConfig,
  IMonorepoConfig,
  IProjectConfig,
} from './types.js';

export class ProjectConfig implements IProjectConfig {
  name: string;
  rootDir: string;

  constructor(config: IProjectConfig) {
    this.name = config.name;
    this.rootDir = config.rootDir;
  }
}

export class MonorepoConfig implements IMonorepoConfig {
  components: ComponentConfig[];
  defaults: DefaultSettings;
  flavors: Record<string, FlavorConfig>;
  project: IProjectConfig;
  vars: Record<string, unknown>;

  constructor(config: IMonorepoConfig) {
    this.components = config.components;
    this.defaults = config.defaults || {};
    this.project = config.project;
    this.vars = config.vars || {};
    this.flavors = config.flavors || {};
  }

  component(name: string): ComponentConfig {
    const config = this.components.find((c) => c.name === name);

    if (!config) {
      throw new Error(`Unknown component ${name}`);
    }

    return config;
  }

  flavor(name: string): FlavorConfig {
    if (!this.flavors[name]) {
      throw new Error(`Unknown flavor ${name}`);
    }

    return this.flavors[name];
  }

  toJSON(): Required<IMonorepoConfig> {
    return {
      components: this.components,
      defaults: this.defaults,
      flavors: this.flavors,
      project: this.project,
      vars: this.vars,
    };
  }

  with(overrides: Partial<IMonorepoConfig>): MonorepoConfig {
    const newConfig: IMonorepoConfig = {
      ...this.toJSON(),
      components: deepMerge({
        mergeArray() {
          // Merge components by identifying them by name
          return (target, source) =>
            deepMergeArray(target, source, (item) => {
              return item.name;
            });
        },
      })(this.components, overrides?.components || []),
      defaults: deepMerge()(this.defaults, overrides.defaults),
      project: deepMerge()(this.project, overrides?.project || {}),
      vars: deepMerge()(this.vars, overrides?.vars || {}),
    };

    return new MonorepoConfig(newConfig);
  }

  withFlavor(name: string): MonorepoConfig {
    return this.with(this.flavor(name));
  }
}
