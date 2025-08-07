import { findUp } from 'find-up';
import { dirname } from 'node:path';

import { toProjectConfig } from './convert.js';
import { IMonorepoConfig } from './types.js';
import { validateUserConfig } from './validation.js';

export * from './convert.js';
export * from './types.js';
export * from './validation.js';

let config: IMonorepoConfig;
export const loadConfig = async (force = false) => {
  if (config && !force) {
    return config;
  }

  const path = await findUp('.emb.yml');

  if (!path) {
    throw new Error('Could not find EMB config anywhere');
  }

  config = toProjectConfig(await validateUserConfig(path), dirname(path));

  return config;
};

export const getConfig = () => {
  if (!config) {
    throw new Error(`Config not loaded, please use 'loadConfig' first`);
  }

  return config;
};
