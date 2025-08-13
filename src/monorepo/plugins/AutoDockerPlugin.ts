import deepmerge from '@fastify/deepmerge';
import { glob } from 'glob';
import { dirname } from 'node:path';

import { ComponentConfig } from '@/config';
import { Monorepo, MonorepoConfig } from '@/monorepo';

import { AbstractPlugin } from './plugin.js';

export type AutoDockerPluginOptions = {
  glob?: string;
  ignore?: string | string[];
};

export const AutoDockerPluginDefaultOptions = {
  glob: '*/Dockerfile',
};

export class AutoDockerPlugin extends AbstractPlugin<AutoDockerPluginOptions> {
  static name = 'autodocker';

  constructor(
    config: Partial<AutoDockerPluginOptions>,
    protected monorepo: Monorepo,
  ) {
    super(
      {
        ...AutoDockerPluginDefaultOptions,
        ...config,
      },
      monorepo,
    );
  }

  async extendConfig(config: MonorepoConfig): Promise<MonorepoConfig> {
    const files = await glob(
      this.config.glob || AutoDockerPluginDefaultOptions.glob,
      {
        ...this.config,
        cwd: config.project.rootDir,
      },
    );

    const overrides = files.reduce(
      (cmps, path) => {
        const name = dirname(path);
        const component = config.components[name];

        const cfg: ComponentConfig = {
          resources: {
            image: {
              type: 'docker/image',
              params: {},
            },
          },
        };

        cmps[name] = component ? deepmerge()(component, cfg) : cfg;

        return cmps;
      },
      {} as { [k: string]: ComponentConfig },
    );

    return new MonorepoConfig({
      ...config,
      components: {
        ...config.components,
        ...overrides,
      },
    });
  }
}
