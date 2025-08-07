import { basename, join } from 'node:path';

import {
  ComponentConfig,
  Config,
  DefaultSettings,
  ProjectConfig,
} from '../config/index.js';
import { expandRecord } from '../utils/expand.js';
import { Component } from './component.js';
import { discoverComponents } from './discovery.js';
export * from './discovery.js';

export class Monorepo {
  public components!: Array<Component>;
  public defaults!: DefaultSettings;
  public project!: ProjectConfig;
  public vars!: Record<string, string>;
  private initialized = false;

  constructor(protected config: Config) {}

  // Helper to expand a record of strings
  async expand<R extends Record<string, unknown>>(record: R): Promise<R> {
    return expandRecord(record, {
      default: 'vars',
      sources: {
        env: process.env as Record<string, string>,
        vars: this.vars,
      },
    });
  }

  // Initialize
  async init() {
    if (this.initialized) {
      throw new Error('Monorepo already initialized');
    }

    this.project = this.config.project;
    this.components = this.config.components.map((c) => new Component(c, this));

    this.vars = await this.expand(this.config.vars || {});
    this.defaults = await this.expand(this.config.defaults || {});

    const discovered = await discoverComponents({
      cwd: this.project.rootDir,
      glob: this.join('*/Dockerfile'),
    });

    const overrides = discovered.map((path) => {
      const name = basename(path);
      const component = this.components.find((cmp) => cmp.name === name);

      const cfg: ComponentConfig = {
        name,
      };

      return component ? component.cloneWith(cfg) : new Component(cfg, this);
    });

    const untouched = this.components.filter(
      (c) =>
        !overrides.find((o) => {
          return o.name === c.name;
        }),
    );

    this.components = [...overrides, ...untouched];

    this.initialized = true;
  }

  // Helper to build relative path to the root dir
  join(...paths: string[]) {
    return join(this.config.project.rootDir, ...paths);
  }

  private discoverComponents() {}
}
