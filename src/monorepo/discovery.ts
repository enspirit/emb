import { glob } from 'glob';
import { dirname, join } from 'node:path';
import { cwd } from 'node:process';

import { getConfig } from '../config/index.js';

export type ComponentDiscoveryOptions = {
  glob: Array<string> | string;
  ignore?: string;
};

export const DefaultDiscoverOptions: ComponentDiscoveryOptions = {
  glob: '*/Dockerfile',
};

export const discoverComponents = async (
  options?: ComponentDiscoveryOptions,
) => {
  const config = await getConfig();
  const rootDir = config.project.rootDir || cwd();
  const opts = {
    ...DefaultDiscoverOptions,
    ...options,
  };

  const globs = Array.isArray(opts.glob) ? [...opts.glob] : [opts.glob];
  const files = await glob(
    globs.map((g) => join(rootDir, g)),
    opts,
  );

  return files.map((path) => {
    return dirname(path);
  });
};
