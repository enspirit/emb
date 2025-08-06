import { glob } from 'glob';
import { dirname } from 'node:path';

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
  const opts = {
    ...DefaultDiscoverOptions,
    ...options,
  };

  const globs = Array.isArray(opts.glob) ? [...opts.glob] : [opts.glob];
  const files = await glob(globs, opts);

  return files.map((path) => {
    return dirname(path);
  });
};
