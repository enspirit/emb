import { resolve } from 'node:path';
import { cwd } from 'node:process';

import { Flavor } from './schema.js';
import {
  ComponentConfig,
  FlavorConfig,
  IMonorepoConfig,
  IProjectConfig,
  UserConfig,
} from './types.js';

export const toFlavor = (flavor: Flavor): FlavorConfig => {
  return {
    ...flavor,
    components: flavor.components,
  };
};

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

  const components: Array<ComponentConfig> = config.components || [];

  const { defaults, env, flavors, plugins, vars } = config;

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
    flavors: flavors?.map(toFlavor),
    plugins,
    project: {
      ...project,
    } as IProjectConfig,
    vars,
  };
};
