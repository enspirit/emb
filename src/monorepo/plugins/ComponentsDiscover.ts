import deepmerge from '@fastify/deepmerge';
import { glob } from 'glob';
import { dirname } from 'node:path';

import { ComponentConfig } from '@/config';
import { Monorepo, MonorepoConfig } from '@/monorepo';

import { IEMBPlugin } from './types.js';

export class ComponentDiscoverPlugin implements IEMBPlugin {
  async run(repo: Monorepo): Promise<MonorepoConfig> {
    const files = await glob('*/Dockerfile', {
      cwd: repo.rootDir,
    });

    const existing = repo.components.map((c) => c.config);

    const overrides = files.map((path) => {
      const name = dirname(path);
      const component = existing.find((cmp) => cmp.name === name);

      const cfg: ComponentConfig = {
        context: name,
        name,
      };

      return component ? deepmerge()(component, cfg) : cfg;
    });

    const untouched = existing.filter(
      (c) =>
        !overrides.find((o) => {
          return o.name === c.name;
        }),
    );

    const components = [...overrides, ...untouched];

    return new MonorepoConfig({
      ...repo.config,
      components,
    });
  }
}
