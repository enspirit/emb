import { join } from 'node:path';

import { IMonorepoConfig } from '@/config';
import { IOperation } from '@/operations/types.js';
import { TemplateExpander } from '@/utils';

import { Component } from './component.js';
import { MonorepoConfig } from './config.js';
import { ComponentDiscoverPlugin } from './plugins/ComponentsDiscover.js';
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

  get env(): Record<string, string | undefined> {
    return this._env || {};
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

  get store() {
    return this._store;
  }

  get tasks() {
    return this.components.reduce<Array<TaskInfo>>((tasks, cmp) => {
      return [...tasks, ...cmp.tasks];
    }, []);
  }

  get vars(): Record<string, unknown> {
    return this._config.vars;
  }

  component(name: string) {
    return new Component(this._config.component(name), this);
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
        env: this.env,
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
  async init() {
    if (this.initialized) {
      throw new Error('Monorepo already initialized');
    }

    this._store = new EMBStore(this);
    await this._store.init();

    // TODO: Introduce way to register plugins
    const discover = new ComponentDiscoverPlugin();
    this._config = await discover.run(this);

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
    this._env = {
      ...process.env,
      ...expanded,
    };

    this.initialized = true;
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
