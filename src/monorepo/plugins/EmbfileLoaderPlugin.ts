import { glob } from 'glob';
import { join } from 'node:path';

import { validateEmbfile } from '@/config';
import { Monorepo, MonorepoConfig } from '@/monorepo';

import { AbstractPlugin } from './plugin.js';

export type EmbfileLoaderPluginOptions = {
  glob?: string;
};

export const EmbfileLoaderPluginDefaultOptions = {
  glob: '*/Embfile.{yaml,yml}',
};

export class EmbfileLoaderPlugin extends AbstractPlugin<EmbfileLoaderPluginOptions> {
  static name = 'embfiles';

  constructor(
    config: Partial<EmbfileLoaderPluginOptions>,
    protected monorepo: Monorepo,
  ) {
    super(
      {
        ...EmbfileLoaderPluginDefaultOptions,
        ...config,
      },
      monorepo,
    );
  }

  async extendConfig(config: MonorepoConfig): Promise<MonorepoConfig> {
    const files = await glob(
      this.config.glob || EmbfileLoaderPluginDefaultOptions.glob,
      {
        ...this.config,
        cwd: config.project.rootDir,
      },
    );

    const newConfig = await files.reduce<Promise<MonorepoConfig>>(
      async (pConfig, path) => {
        const config = await pConfig;
        const embfile = await join(config.project.rootDir, path);
        const component = await validateEmbfile(embfile);

        return config.with({
          components: [component],
        });
      },
      Promise.resolve(config),
    );

    return newConfig;
  }
}
