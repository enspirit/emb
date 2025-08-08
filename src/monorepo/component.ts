import deepmerge from '@fastify/deepmerge';
import { join } from 'node:path';

import { ComponentConfig } from '../config/index.js';
import { DockerComponentBuild, Prerequisite } from '../docker/index.js';
import { loadFilePrerequisites } from '../git/index.js';
import { Monorepo, TaskInfo } from './index.js';

export class Component {
  constructor(
    protected _config: ComponentConfig,
    protected monorepo: Monorepo,
  ) {}

  get config() {
    return structuredClone(this._config);
  }

  get context() {
    return this.config.context;
  }

  get dependencies() {
    return this.monorepo.components.filter((c) =>
      this.config.dependencies?.includes(c.name),
    );
  }

  get imageName() {
    return join(this.monorepo.name, this.name);
  }

  get imageTag() {
    return this.monorepo.defaults.docker?.tag || 'latest';
  }

  get labels() {
    return {
      'emb/component': this.name,
      ...this._config.labels,
    };
  }

  get name() {
    return this.config.name;
  }

  get rootdir() {
    return this.monorepo.join(this.context);
  }

  get tasks(): Array<TaskInfo> {
    return (this.config.tasks || [])?.map((t) => {
      return {
        ...t,
        component: this.name,
        id: `${this.name}:${t.name}`,
      };
    });
  }

  cloneWith(config: Partial<ComponentConfig>) {
    return new Component(
      {
        ...this.config,
        ...config,
      },
      this.monorepo,
    );
  }

  async getPrerequisites(): Promise<Array<Prerequisite>> {
    return loadFilePrerequisites(this.rootdir);
  }

  join(path: string) {
    return this.monorepo.join(this.name, path);
  }

  async toDockerBuild(): Promise<DockerComponentBuild> {
    return {
      buildArgs: await this.monorepo.expand(
        deepmerge()(
          this.monorepo.defaults.docker?.buildArgs || {},
          this.config.buildArgs || {},
        ),
      ),
      context: this.rootdir,
      dockerfile: this.config.dockerfile || 'Dockerfile',
      labels: deepmerge()(
        {
          ...this.monorepo.defaults.docker?.labels,
        },
        this.labels,
      ),
      name: this.imageName,
      prerequisites: await this.getPrerequisites(),
      tag: this.imageTag
        ? await this.monorepo.expand(this.imageTag as string)
        : undefined,
      target: this.config.target || this.monorepo.defaults?.docker?.target,
    };
  }
}
