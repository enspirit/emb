import jsonpatch from 'fast-json-patch';
import { join } from 'node:path';

import { EMBConfig, JsonPatchOperation } from '@/config/types.js';
import { IOperation } from '@/operations';
import { Expandable, TemplateExpander } from '@/utils';

import { Component } from './component.js';
import { MonorepoConfig } from './config.js';
import { AbstractPluginConstructor, getPlugin } from './plugins/index.js';
import { EMBStore } from './store/index.js';
import { ResourceInfo, TaskInfo } from './types.js';

export class Monorepo {
  private _config: MonorepoConfig;
  private _store!: EMBStore;
  private initialized = false;

  constructor(
    config: EMBConfig,
    private _rootDir: string,
    private defaultFlavor: string = 'default',
  ) {
    this._config = new MonorepoConfig(config);
  }

  get config(): EMBConfig {
    return this._config.toJSON();
  }

  get defaults() {
    return this._config.defaults;
  }

  get flavors() {
    return this._config.flavors;
  }

  get name() {
    return this._config.project.name;
  }

  get rootDir() {
    return this._config.project.rootDir
      ? join(this._rootDir, this._config.project.rootDir)
      : this._rootDir;
  }

  get currentFlavor() {
    return this.defaultFlavor;
  }

  get store() {
    return this._store;
  }

  get components() {
    return Object.entries(this._config.components).map(
      ([name, c]) => new Component(name, c, this),
    );
  }

  component(name: string) {
    return new Component(name, this._config.component(name), this);
  }

  get tasks() {
    const globalTasks = Object.values(this._config.tasks);

    return this.components.reduce<Array<TaskInfo>>((tasks, cmp) => {
      const cmpTasks = Object.entries(cmp.tasks || {}).map(([name, task]) => {
        return {
          ...task,
          name,
          component: cmp.name,
          id: `${cmp.name}:${name}`,
        };
      });

      return [...tasks, ...cmpTasks];
    }, globalTasks);
  }

  task(nameOrId: string): TaskInfo {
    const byId = this.tasks.find((t) => t.id === nameOrId);

    if (byId) {
      return byId;
    }

    const found = this.tasks.filter((t) => t.name === nameOrId);

    if (found.length > 1) {
      throw new Error(
        `Task name ambigous, found multiple matches: ${nameOrId}`,
      );
    }

    if (found.length === 0) {
      throw new Error(`Task not found: ${nameOrId}`);
    }

    return found[0];
  }

  get resources(): Array<ResourceInfo> {
    return this.components.reduce<Array<ResourceInfo>>((resources, cmp) => {
      return [...resources, ...Object.values(cmp.resources)];
    }, []);
  }

  resource(nameOrId: string): ResourceInfo {
    const byId = this.resources.find((t) => t.id === nameOrId);

    if (byId) {
      return byId;
    }

    const found = this.resources.filter((t) => t.name === nameOrId);

    if (found.length > 1) {
      throw new Error(
        `Resource name ambigous, found multiple matches: ${nameOrId}`,
      );
    }

    if (found.length === 0) {
      throw new Error(`Resource not found: ${nameOrId}`);
    }

    return found[0];
  }

  get vars(): Record<string, unknown> {
    return this._config.vars;
  }

  // Helper to expand a record of strings
  async expand<T extends Expandable>(
    toExpand: T,
    expander = new TemplateExpander(),
  ) {
    const options = {
      default: 'vars',
      sources: {
        env: process.env,
        vars: this.vars,
      },
    };

    return expander.expandRecord(toExpand, options);
  }

  private async installStore(store?: EMBStore) {
    this._store = store || new EMBStore(this);
    await this._store.init();
  }

  private async installEnv() {
    // Expand env vars at the init and then we don't expand anymore
    // The only available source for them is the existing env
    const expander = new TemplateExpander();
    const options = {
      default: 'env',
      sources: {
        env: process.env,
      },
    };
    const expanded = await expander.expandRecord(this._config.env, options);
    Object.assign(process.env, expanded);
  }

  // Initialize
  async init(): Promise<Monorepo> {
    if (this.initialized) {
      throw new Error('Monorepo already initialized');
    }

    await this.installStore();

    const plugins = this._config.plugins.map((p) => {
      const PluginClass: AbstractPluginConstructor = getPlugin(p.name);

      return new PluginClass(p.config, this);
    });

    this._config = await plugins.reduce(async (pConfig, plugin) => {
      const newConfig = await plugin.extendConfig?.(await pConfig);
      return newConfig ?? pConfig;
    }, Promise.resolve(this._config));

    await this.installEnv();

    this.initialized = true;

    await Promise.all(
      plugins.map(async (p) => {
        await p.init?.();
      }),
    );

    return this;
  }

  // Helper to build relative path to the root dir
  join(...paths: string[]) {
    return join(this.rootDir, ...paths);
  }

  run<I extends void, O>(operation: IOperation<I, O>): Promise<O>;
  run<I extends void, O>(operation: IOperation<I, O>): Promise<O>;
  run<I, O>(operation: IOperation<I, O>, input: I): Promise<O>;
  run<I, O>(operation: IOperation<I, O>, input = undefined): Promise<O> {
    if (input === undefined) {
      return (operation as IOperation<void, O>).run();
    }

    return operation.run(input);
  }

  private async expandPatches(patches: Array<JsonPatchOperation>) {
    const expanded = Promise.all(
      patches.map(async (patch) => {
        if (!('value' in patch)) {
          return patch;
        }

        return {
          ...patch,
          value: await this.expand(patch.value as Expandable),
        };
      }),
    );

    return expanded;
  }

  async withFlavor(flavorName: string): Promise<Monorepo> {
    const patches = await this.expandPatches(
      this._config.flavor(flavorName).patches || [],
    );
    const original = this._config.toJSON();
    const errors = jsonpatch.validate(patches || [], original);

    if (errors) {
      throw errors;
    }

    const withComponentPatches = await this.components.reduce(
      async (pConfig, cmp) => {
        const config = await pConfig;
        const componentPatches = await this.expandPatches(
          cmp.flavor(flavorName, false)?.patches || [],
        );

        const errors = jsonpatch.validate(
          componentPatches || [],
          config.components[cmp.name],
        );

        if (errors) {
          throw errors;
        }

        config.components[cmp.name] = componentPatches.reduce(
          (doc, patch, index) => {
            return jsonpatch.applyReducer(doc, patch, index);
          },
          config.components[cmp.name],
        );

        return config;
      },
      Promise.resolve(original),
    );

    const withGlobalPatches = patches.reduce((doc, patch, index) => {
      return jsonpatch.applyReducer(doc, patch, index);
    }, withComponentPatches);

    const newConfig = new MonorepoConfig(withGlobalPatches);

    const repo = new Monorepo(newConfig, this._rootDir, flavorName);
    await repo.installStore();
    await repo.installEnv();
    return repo;
  }
}
