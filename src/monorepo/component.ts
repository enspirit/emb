import { join } from 'node:path';

import { ComponentConfig } from '../config/index.js';
import { DockerComponentBuild } from '../docker/index.js';
import { Monorepo } from './index.js';

export class Component {
  constructor(
    protected config: ComponentConfig,
    protected monorepo: Monorepo,
  ) {}

  get name() {
    return this.config.name;
  }

  get rootdir() {
    return this.monorepo.join(this.name);
  }

  join(path: string) {
    return this.monorepo.join(this.name, path);
  }

  toDockerBuild(): DockerComponentBuild {
    return {
      context: this.rootdir,
      dockerfile: 'Dockerfile',
      name: this.config.name,
    };
  }
}
