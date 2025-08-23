import deepmerge from '@fastify/deepmerge';
import { glob } from 'glob';
import { basename, dirname } from 'node:path';

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
        cwd: this.monorepo.rootDir,
      },
    );

    const overrides = files.reduce(
      (cmps, path) => {
        const rootDir = dirname(path);
        const name = basename(rootDir);
        const component = config.components[name];

        const cfg: ComponentConfig = {
          rootDir,
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
