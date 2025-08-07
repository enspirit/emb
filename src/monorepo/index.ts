import { join } from 'node:path';

import { IMonorepoConfig } from '../config/index.js';
import { TemplateExpander } from '../utils/TemplateExpander.js';
import { Component } from './component.js';
import { MonorepoConfig } from './config.js';
import { ComponentDiscoverPlugin } from './plugins/ComponentsDiscover.js';
import { EMBStore } from './store/index.js';

export * from './config.js';

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

  get name() {
    return this._config.project.name;
  }

  get rootDir() {
    return this._config.project.rootDir;
  }

  get store() {
    return this._store;
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

  getEnvVars(): Promise<Record<string, unknown>> {
    return this.expand(this._config.env || {});
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
    this._config.vars = await this.expand(this._config.vars);

    this.initialized = true;
  }

  // Helper to build relative path to the root dir
  join(...paths: string[]) {
    return join(this._config.project.rootDir, ...paths);
  }
}
