import { resolve } from 'node:path';
import { cwd } from 'node:process';

import {
  ComponentConfig,
  IMonorepoConfig,
  IProjectConfig,
  UserConfig,
} from './types.js';

export const toProjectConfig = (
  config: UserConfig,
  rootDir?: string,
): IMonorepoConfig => {
  const project: Partial<IProjectConfig> =
    typeof config.project === 'string'
      ? { name: config.project }
      : (config.project as IProjectConfig);

  if (project.rootDir) {
    project.rootDir = rootDir
      ? resolve(rootDir, project.rootDir)
      : project.rootDir;
  } else {
    project.rootDir = rootDir || cwd();
  }

  const components: Array<ComponentConfig> = (config.components || []).map(
    (cmp) => {
      return typeof cmp === 'string'
        ? { context: cmp, name: cmp }
        : (cmp as ComponentConfig);
    },
  );

  const { defaults, env, vars } = config;

  return {
    components,
    defaults: {
      ...defaults,
      docker: {
        ...defaults?.docker,
        labels: {
          ...defaults?.docker?.labels,
          'emb/project': project.name!,
        },
      },
    },
    env,
    project: {
      ...project,
    } as IProjectConfig,
    vars,
  };
};
