import { join } from 'node:path';

import { ComponentConfig } from '../config/index.js';
import { DockerComponentBuild, Prerequisite } from '../docker/index.js';
import { loadFilePrerequisites } from '../git/index.js';
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

  getPrerequisites(): Promise<Array<Prerequisite>> {
    return loadFilePrerequisites(this.rootdir);
  }

  join(path: string) {
    return this.monorepo.join(this.name, path);
  }

  async toDockerBuild(): Promise<DockerComponentBuild> {
    return {
      buildArgs: this.config.buildArgs,
      context: this.rootdir,
      dockerfile: 'Dockerfile',
      name: this.config.name,
      prerequisites: await this.getPrerequisites(),
    };
  }
}
