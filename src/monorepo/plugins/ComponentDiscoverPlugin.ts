import deepmerge from '@fastify/deepmerge';
import { glob } from 'glob';
import { dirname } from 'node:path';

import { ComponentConfig } from '@/config';
import { Monorepo, MonorepoConfig } from '@/monorepo';

import { AbstractPlugin } from './plugin.js';

export type ComponentDiscoverPluginOptions = {
  glob?: string;
  ignore?: string | string[];
};

export const ComponentDiscoverPluginDefaultOptions = {
  glob: '*/Dockerfile',
};

export class ComponentDiscoverPlugin extends AbstractPlugin<ComponentDiscoverPluginOptions> {
  static name = 'autodiscover';

  constructor(
    config: Partial<ComponentDiscoverPluginOptions>,
    protected monorepo: Monorepo,
  ) {
    super(
      {
        ...ComponentDiscoverPluginDefaultOptions,
        ...config,
      },
      monorepo,
    );
  }

  async extendConfig(config: MonorepoConfig): Promise<MonorepoConfig> {
    const files = await glob(
      this.config.glob || ComponentDiscoverPluginDefaultOptions.glob,
      {
        ...this.config,
        cwd: config.project.rootDir,
      },
    );

    const overrides = files.map((path) => {
      const name = dirname(path);
      const component = config.components.find((cmp) => cmp.name === name);

      const cfg: ComponentConfig = {
        name,
        docker: {
          context: name,
        },
      };

      return component ? deepmerge()(component, cfg) : cfg;
    });

    const untouched = config.components.filter(
      (c) =>
        !overrides.find((o) => {
          return o.name === c.name;
        }),
    );

    const components = [...overrides, ...untouched];

    return new MonorepoConfig({
      ...config,
      components,
    });
  }
}
