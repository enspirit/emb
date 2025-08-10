import { join } from 'node:path';

import { IMonorepoConfig } from '@/config';
import { IOperation } from '@/operations';
import { TemplateExpander } from '@/utils';

import { Component } from './component.js';
import { MonorepoConfig } from './config.js';
import { AbstractPluginConstructor, getPlugin } from './plugins/index.js';
import { EMBStore } from './store/index.js';
import { TaskInfo } from './types.js';

export class Monorepo {
  private _config: MonorepoConfig;
  private _env!: Record<string, string | undefined>;
  private _store!: EMBStore;
  private initialized = false;

  constructor(config: IMonorepoConfig) {
    this._config = new MonorepoConfig(config);
    this._env = config.env || {};
  }

  // TODO: cache/improve
  get components() {
    return this._config.components.map((c) => new Component(c, this));
  }

  get config(): IMonorepoConfig {
    return this._config.toJSON();
  }

  get defaults() {
    return this._config.defaults;
  }

  get flavors() {
    return this._config.flavors.map((f) => f.name);
  }

  get name() {
    return this._config.project.name;
  }

  get rootDir() {
    return this._config.project.rootDir;
  }

  get currentFlavor() {
    return this._config.currentFlavor;
  }

  get store() {
    return this._store;
  }

  get tasks() {
    const globalTasks = (this._config.tasks || [])?.map((t) => {
      return {
        ...t,
        id: `global:${t.name}`,
      };
    });

    return this.components.reduce<Array<TaskInfo>>((tasks, cmp) => {
      return [...tasks, ...cmp.tasks];
    }, globalTasks);
  }

  get vars(): Record<string, unknown> {
    return this._config.vars;
  }

  component(name: string) {
    return new Component(this._config.component(name), this);
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

  // Initialize
  async init(): Promise<Monorepo> {
    if (this.initialized) {
      throw new Error('Monorepo already initialized');
    }

    this._store = new EMBStore(this);
    await this._store.init();

    const plugins = this._config.plugins.map((p) => {
      const PluginClass: AbstractPluginConstructor = getPlugin(p.name);

      return new PluginClass(p.config, this);
    });

    this._config = await plugins.reduce(async (pConfig, plugin) => {
      const newConfig = await plugin.extendConfig?.(await pConfig);
      return newConfig ?? pConfig;
    }, Promise.resolve(this._config));

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

  async withFlavor(name: string) {
    const repo = new Monorepo(this._config.withFlavor(name));
    await repo.init();

    return repo;
  }
}
