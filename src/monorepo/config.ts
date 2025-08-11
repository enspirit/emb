import { ProjectFlavors, Tasks, toIdentifedHash } from '@';
import deepMerge from '@fastify/deepmerge';

import {
  ComponentConfig,
  DefaultsConfig,
  PluginConfig,
  ProjectConfig,
  ProjectFlavorConfig,
  UserConfig,
} from '@/config';

export class MonorepoConfig implements UserConfig {
  project: ProjectConfig;
  defaults: DefaultsConfig;
  env: Record<string, string>;
  flavors: ProjectFlavors;
  plugins: Array<PluginConfig>;
  vars: Record<string, unknown>;
  tasks: Tasks;
  components: Record<string, ComponentConfig>;

  constructor(config: UserConfig) {
    this.defaults = config.defaults || {};
    this.project = config.project;
    this.vars = config.vars || {};
    this.flavors = config.flavors || {};
    this.env = config.env || {};
    this.plugins = config.plugins || [];
    this.tasks = toIdentifedHash(config.tasks || {}, 'global');
    this.components = config.components || {};
  }

  component(id: string): ComponentConfig {
    const config = this.components[id];

    if (!config) {
      throw new Error(`Unknown component ${id}`);
    }

    return config;
  }

  flavor(name: string): ProjectFlavorConfig {
    const flavor = this.flavors[name];

    if (!flavor) {
      throw new Error(`Unknown flavor: ${name}`);
    }

    return flavor;
  }

  toJSON(): Required<UserConfig> {
    return structuredClone({
      components: this.components,
      defaults: this.defaults,
      env: this.env,
      flavors: this.flavors,
      plugins: this.plugins,
      project: this.project,
      tasks: this.tasks,
      vars: this.vars,
    });
  }

  with(overrides: Partial<UserConfig>): MonorepoConfig {
    const oldConfig = this.toJSON();
    const newConfig = deepMerge()(oldConfig, overrides);

    return new MonorepoConfig(newConfig as UserConfig);
  }
}
