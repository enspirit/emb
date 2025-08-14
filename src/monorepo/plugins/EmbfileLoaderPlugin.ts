import deepmerge from '@fastify/deepmerge';
import { glob } from 'glob';
import { basename, dirname, join } from 'node:path';

import { validateEmbfile } from '@/config';
import { Monorepo, MonorepoConfig } from '@/monorepo';

import { AbstractPlugin } from './plugin.js';

export type EmbfileLoaderPluginOptions = {
  glob?: string | string[];
};

export const EmbfileLoaderPluginDefaultOptions = {
  glob: '*/Embfile.{yaml,yml}',
};

export class EmbfileLoaderPlugin extends AbstractPlugin<
  Required<EmbfileLoaderPluginOptions>
> {
  static name = 'embfiles';

  constructor(
    cfg: Partial<EmbfileLoaderPluginOptions>,
    protected monorepo: Monorepo,
  ) {
    const config = {
      ...EmbfileLoaderPluginDefaultOptions,
      ...cfg,
    };
    if (!Array.isArray(config.glob)) {
      config.glob = [config.glob];
    }

    super(config, monorepo);
  }

  async extendConfig(config: MonorepoConfig): Promise<MonorepoConfig> {
    const files = await glob(this.config.glob, {
      ...this.config,
      cwd: this.monorepo.rootDir,
    });

    const newConfig = await files.reduce<Promise<MonorepoConfig>>(
      async (pConfig, path) => {
        const config = await pConfig;
        const rootDir = dirname(path);
        const name = basename(rootDir);
        const embfile = await join(this.monorepo.rootDir, path);
        const component = await validateEmbfile(embfile);
        const original = config.components[name];

        const newComponent = deepmerge()(original || {}, {
          ...component,
          rootDir,
        });

        return config.with({
          components: {
            [name]: newComponent,
          },
        });
      },
      Promise.resolve(config),
    );

    return newConfig;
  }
}
