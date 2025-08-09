import deepmerge from '@fastify/deepmerge';
import { join } from 'node:path';

import { ComponentConfig } from '@/config';
import { DockerComponentBuild } from '@/docker';
import { Monorepo, TaskInfo } from '@/monorepo';
import { FilePrerequisite, GitPrerequisitePlugin } from '@/prerequisites';

export class Component {
  constructor(
    protected _config: ComponentConfig,
    protected monorepo: Monorepo,
  ) {}

  get config() {
    return structuredClone(this._config);
  }

  get context() {
    return this.config.docker?.context || this.name;
  }

  get dependencies() {
    return this.monorepo.components.filter((c) =>
      this.config.docker?.dependencies?.includes(c.name),
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
      ...this._config.docker?.labels,
    };
  }

  get name() {
    return this.config.name;
  }

  get rootdir() {
    return this.monorepo.join(this.context || this.name);
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

  async getPrerequisites(): Promise<Array<FilePrerequisite>> {
    // TODO: move this to config with potential overridzs
    const plugin = new GitPrerequisitePlugin();
    return plugin.collect(this);
  }

  join(path: string) {
    return this.monorepo.join(this.context || this.name, path);
  }

  async toDockerBuild(): Promise<DockerComponentBuild> {
    return {
      buildArgs: await this.monorepo.expand(
        deepmerge()(
          this.monorepo.defaults.docker?.buildArgs || {},
          this.config.docker?.buildArgs || {},
        ),
      ),
      context: this.rootdir,
      dockerfile: this.config.docker?.dockerfile || 'Dockerfile',
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
        : 'latest',
      target:
        this.config.docker?.target || this.monorepo.defaults?.docker?.target,
    };
  }
}
