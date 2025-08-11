import jsonpatch from 'fast-json-patch';
import { join } from 'node:path';

import { UserConfig } from '@/config/types.js';
import { IOperation } from '@/operations';
import { TemplateExpander } from '@/utils';

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
    config: UserConfig,
    private defaultFlavor: string = 'default',
  ) {
    this._config = new MonorepoConfig(config);
  }

  get config(): UserConfig {
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
    return this._config.project.rootDir;
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
    const globalTasks = Object.entries(this._config.tasks || {}).map(
      ([name, task]) => {
        return {
          ...task,
          name,
          id: `global:${name}`,
        };
      },
    );

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
      const cmpResources = Object.entries(cmp.resources || {}).map(
        ([name, task]) => {
          return {
            ...task,
            name,
            id: `${cmp.name}:${name}`,
          };
        },
      );

      return [...resources, ...cmpResources];
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
  async expand(str: string, expander?: TemplateExpander): Promise<string>;
  async expand<R extends Record<string, unknown>>(
    record: R,
    expander?: TemplateExpander,
  ): Promise<R>;
  async expand(strOrRecord: unknown, expander = new TemplateExpander()) {
    const options = {
      default: 'vars',
      sources: {
        env: process.env,
        vars: this.vars,
      },
    };

    if (typeof strOrRecord === 'string') {
      return expander.expand(strOrRecord as string, options);
    }

    return expander.expandRecord(
      strOrRecord as Record<string, unknown>,
      options,
    );
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
    return join(this._config.project.rootDir, ...paths);
  }

  run<I, O>(operation: IOperation<I, O>, args: I): Promise<O>;
  async run<I extends void, O extends void>(
    operation: IOperation<I, O>,
    args: I,
  ) {
    return operation.run(args);
  }

  async withFlavor(flavorName: string): Promise<Monorepo> {
    const patches = this._config.flavor(flavorName).patches || [];
    const original = this._config.toJSON();
    const errors = jsonpatch.validate(patches || [], original);

    if (errors) {
      throw new Error('Invalid patch(es) detected');
    }

    const withComponentPatches = this.components.reduce((config, cmp) => {
      const componentPatches = cmp.flavor(flavorName, false)?.patches || [];

      const errors = jsonpatch.validate(
        componentPatches || [],
        config.components[cmp.name],
      );

      if (errors) {
        throw new Error('Invalid patch(es) detected');
      }

      config.components[cmp.name] = componentPatches.reduce(
        (doc, patch, index) => {
          return jsonpatch.applyReducer(doc, patch, index);
        },
        config.components[cmp.name],
      );

      return config;
    }, original);

    const withGlobalPatches = patches.reduce((doc, patch, index) => {
      return jsonpatch.applyReducer(doc, patch, index);
    }, withComponentPatches);

    const newConfig = new MonorepoConfig(withGlobalPatches);

    const repo = new Monorepo(newConfig, flavorName);
    await repo.installStore();
    await repo.installEnv();
    return repo;
  }
}
