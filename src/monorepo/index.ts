import { join } from 'node:path';

import { Config } from '../config/index.js';
import { Component } from './component.js';
export * from './discovery.js';

export class Monorepo {
  public readonly components: Array<Component>;
  private initialized = false;

  constructor(protected config: Config) {
    this.components = config.components.map((c) => new Component(c, this));
  }

  // Initialize
  async init() {
    if (this.initialized) {
      throw new Error('Monorepo already initialized');
    }

    this.initialized = true;
  }

  // Helper to build relative path to the root dir
  join(...paths: string[]) {
    return join(this.config.project.rootDir, ...paths);
  }
}
