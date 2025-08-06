import { basename, dirname, join } from 'node:path';

import { ComponentConfig, Config } from '../config/index.js';
import { Component } from './component.js';
import { discoverComponents } from './discovery.js';
export * from './discovery.js';

export class Monorepo {
  public components: Array<Component>;
  private initialized = false;

  constructor(protected config: Config) {
    this.components = config.components.map((c) => new Component(c, this));
  }

  // Initialize
  async init() {
    if (this.initialized) {
      throw new Error('Monorepo already initialized');
    }

    const discovered = await discoverComponents({
      glob: this.join('*/Dockerfile'),
    });

    this.components = discovered.map((path) => {
      const name = basename(path);
      const component = this.components.find((cmp) => cmp.name === name);

      const cfg: ComponentConfig = {
        name,
      };

      return component ? component.cloneWith(cfg) : new Component(cfg, this);
    });

    this.initialized = true;
  }

  // Helper to build relative path to the root dir
  join(...paths: string[]) {
    return join(this.config.project.rootDir, ...paths);
  }
}
