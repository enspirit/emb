import deepmerge from '@fastify/deepmerge';
import { glob } from 'glob';
import { basename, dirname, join } from 'node:path';

import { validateEmbfile } from '@/config';
import { ConfigFileError, ConfigValidationError } from '@/errors.js';
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
      follow: true,
    });

    const validationErrors: ConfigFileError[] = [];
    let newConfig = config;

    for (const path of files) {
      const rootDir = dirname(path);
      const name = basename(rootDir);
      const embfile = join(this.monorepo.rootDir, path);

      try {
        const component = await validateEmbfile(embfile);
        const original = newConfig.components[name];

        const newComponent = deepmerge()(original || {}, {
          ...component,
          rootDir,
        });

        newConfig = newConfig.with({
          components: {
            [name]: newComponent,
          },
        });
      } catch (error) {
        if (error instanceof ConfigValidationError) {
          validationErrors.push(...error.fileErrors);
        } else {
          throw error;
        }
      }
    }

    if (validationErrors.length > 0) {
      throw new ConfigValidationError(validationErrors);
    }

    return newConfig;
  }
}
