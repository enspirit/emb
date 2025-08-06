import { ComponentConfig } from '../config/index.js';
import { DockerComponentBuild, Prerequisite } from '../docker/index.js';
import { loadFilePrerequisites } from '../git/index.js';
import { expand } from '../utils/expand.js';
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
    const buildArgs = await this.expandBuildArgs();

    return {
      buildArgs,
      context: this.rootdir,
      dockerfile: 'Dockerfile',
      name: this.config.name,
      prerequisites: await this.getPrerequisites(),
    };
  }

  private async expandBuildArgs(): Promise<Record<PropertyKey, string>> {
    return Object.entries(this.config.buildArgs || {}).reduce(
      async (vars, [name, str]) => {
        const previous = await vars;

        previous[name] = await expand(str, {
          sources: {
            env: process.env as Record<string, string>,
          },
        });

        return previous;
      },
      Promise.resolve({}) as Promise<Record<PropertyKey, string>>,
    );
  }
}
