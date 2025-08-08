import deepMerge from '@fastify/deepmerge';

import {
  ComponentConfig,
  DefaultSettings,
  FlavorConfig,
  IMonorepoConfig,
  IProjectConfig,
} from '@/config';
import { deepMergeArray } from '@/utils';

export class MonorepoConfig implements IMonorepoConfig {
  components: ComponentConfig[];
  defaults: DefaultSettings;
  env: Record<string, string>;
  flavors: Array<FlavorConfig>;
  project: IProjectConfig;
  vars: Record<string, unknown>;

  constructor(config: IMonorepoConfig) {
    this.components = config.components;
    this.defaults = config.defaults || {};
    this.project = config.project;
    this.vars = config.vars || {};
    this.flavors = config.flavors || [];
    this.env = config.env || {};
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

  toJSON(): Required<IMonorepoConfig> {
    return {
      components: this.components,
      defaults: this.defaults,
      env: this.env,
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
