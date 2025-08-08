import { join } from 'node:path';

import { IMonorepoConfig } from '@/config';
import { TemplateExpander } from '@/utils';

import { Component } from './component.js';
import { MonorepoConfig } from './config.js';
import { ComponentDiscoverPlugin } from './plugins/ComponentsDiscover.js';
import { EMBStore } from './store/index.js';
import { TaskInfo } from './types.js';

export class Monorepo {
  private _config: MonorepoConfig;
  private _store!: EMBStore;
  private initialized = false;

  constructor(config: IMonorepoConfig) {
    this._config = new MonorepoConfig(config);
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
    return Object.keys(this._config.flavors || {});
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
  async expand(str: string): Promise<string>;
  async expand<R extends Record<string, unknown>>(record: R): Promise<R>;
  async expand(strOrRecord: unknown) {
    const expander = new TemplateExpander();

    const options = {
      default: 'vars',
      sources: {
        env: process.env as Record<string, unknown>,
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

  async getEnvVars(expanded = true): Promise<Record<string, unknown>> {
    return expanded ? this.expand(this._config.env || {}) : this.vars;
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

    // Find a more elegant to do this
    // decide on an exact when
    // TODO: we should force everyone to pass through getEnvVars() instead
    this._config.vars = await this.expand(this._config.vars);

    this.initialized = true;
  }

  // Helper to build relative path to the root dir
  join(...paths: string[]) {
    return join(this._config.project.rootDir, ...paths);
  }

  async withFlavor(name: string) {
    const repo = new Monorepo(this._config.withFlavor(name));
    await repo.init();

    return repo;
  }
}
