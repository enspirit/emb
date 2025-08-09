import deepmerge from '@fastify/deepmerge';
import { glob } from 'glob';
import { dirname } from 'node:path';

import { ComponentConfig } from '@/config';
import { MonorepoConfig } from '@/monorepo';

import { IEMBPlugin } from './types.js';

export class ComponentDiscoverPlugin implements IEMBPlugin {
  name = 'autodiscover';

  async extendConfig(config: MonorepoConfig): Promise<MonorepoConfig> {
    const files = await glob('*/Dockerfile', {
      cwd: config.project.rootDir,
    });

    const overrides = files.map((path) => {
      const name = dirname(path);
      const component = config.components.find((cmp) => cmp.name === name);

      const cfg: ComponentConfig = {
        context: name,
        name,
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
