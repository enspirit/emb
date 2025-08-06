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

  const files = await glob(opts.glob, options);

  return files.map((path) => {
    return dirname(path);
  });
};
