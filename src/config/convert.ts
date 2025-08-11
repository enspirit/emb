import { resolve } from 'node:path';
import { cwd } from 'node:process';

import { EMBConfig, ProjectConfig, UserConfig } from './types.js';

export const toUserConfig = (
  config: EMBConfig,
  rootDir?: string,
): UserConfig => {
  const project: ProjectConfig = {
    ...config.project,
    rootDir: config.project.rootDir
      ? rootDir
        ? resolve(rootDir, config.project.rootDir)
        : config.project.rootDir
      : rootDir || cwd(),
  };

  return {
    ...config,
    components: config.components || {},
    flavors: config.flavors || {},
    project,
  };
};
