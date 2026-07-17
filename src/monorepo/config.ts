import { ProjectFlavors, Tasks, toIdentifedHash } from '@';
import deepMerge from '@fastify/deepmerge';

import {
  ComponentConfig,
  DefaultsConfig,
  EMBConfig,
  PluginConfig,
  ProjectConfig,
  ProjectFlavorConfig,
  TaskConfig,
} from '@/config';

export class MonorepoConfig implements EMBConfig {
  project: ProjectConfig;
  defaults: DefaultsConfig;
  env: Record<string, string>;
  flavors: ProjectFlavors;
  plugins: Array<PluginConfig>;
  vars: Record<string, unknown>;
  tasks: Tasks;
  components: Record<string, ComponentConfig>;

  constructor(config: EMBConfig) {
    this.defaults = config.defaults || {};
    this.project = config.project;
    this.vars = config.vars || {};
    this.flavors = config.flavors || {};
    this.env = config.env || {};
    this.plugins = config.plugins || [];
    this.tasks = toIdentifedHash(config.tasks || {});
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

  toJSON(): Required<EMBConfig> {
    return structuredClone({
      components: this.components,
      defaults: this.defaults,
      env: this.env,
      flavors: this.flavors,
      plugins: this.plugins,
      project: this.project,
      tasks: this.serializableTasks(),
      vars: this.vars,
    });
  }

  /**
   * The constructor runs tasks through toIdentifedHash, which stamps each with
   * synthesized `id`/`name` (and `component`) keys for runtime resolution.
   * Those are not part of the declarative config — TaskConfig forbids them —
   * so strip them when serializing, otherwise the output of `emb config print`
   * fails its own re-validation.
   */
  private serializableTasks(): Record<string, TaskConfig> {
    return Object.fromEntries(
      Object.entries(this.tasks).map(([key, task]) => {
        const { component: _c, id: _id, name: _name, ...rest } = task;
        return [key, rest];
      }),
    );
  }

  with(overrides: Partial<EMBConfig>): MonorepoConfig {
    const oldConfig = this.toJSON();
    const newConfig = deepMerge()(oldConfig, overrides);

    return new MonorepoConfig(newConfig as EMBConfig);
  }
}
