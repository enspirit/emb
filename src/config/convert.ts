import { resolve } from 'node:path';
import { cwd } from 'node:process';

import { Component, Flavor } from './schema.js';
import {
  ComponentConfig,
  FlavorConfig,
  IMonorepoConfig,
  IProjectConfig,
  UserConfig,
} from './types.js';

export const toFlavor = (flavor: Flavor): FlavorConfig => {
  return {
    components: flavor.components?.map(toComponent),
    defaults: flavor.defaults,
  };
};

export const toFlavors = (
  flavors: Record<string, Flavor> = {},
): Record<string, FlavorConfig> => {
  return Object.entries(flavors).reduce<Record<string, FlavorConfig>>(
    (flavors, [name, config]) => {
      flavors[name] = toFlavor(config);
      return flavors;
    },
    {},
  );
};

export const toComponent = (cmp: Component): ComponentConfig => {
  return typeof cmp === 'string'
    ? { context: cmp, name: cmp }
    : (cmp as ComponentConfig);
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

  const components: Array<ComponentConfig> = (config.components || []).map(
    (cmp) => toComponent(cmp),
  );

  const { defaults, env, flavors, vars } = config;

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
    flavors: toFlavors(flavors),
    project: {
      ...project,
    } as IProjectConfig,
    vars,
  };
};
