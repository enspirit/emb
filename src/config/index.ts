import { Ajv } from 'ajv';
import { findUp } from 'find-up';
import { readFile, stat } from 'node:fs/promises';
import { cwd } from 'node:process';
import yaml from 'yaml';

import configSchema from './schema.json' with { type: 'json' };

export type Component = {
  name: string;
};

export type Service = {
  name: string;
};

type UserConfig = {
  components: Array<string | { name: string }>;
  defaults?: DefaultSettings;
  project: string | { name: string };
  vars?: Record<string, string>;
};

export type ProjectConfig = {
  name: string;
  rootDir: string;
};

export type ComponentConfig = {
  buildArgs?: Record<PropertyKey, string>;
  dockerfile?: string;
  name: string;
  target?: string;
};

export type DefaultSettings = {
  docker?: {
    buildArgs?: Record<string, string>;
    tag?: string;
    target?: string;
  };
};

export type Config = {
  components: Array<ComponentConfig>;
  defaults?: DefaultSettings;
  project: ProjectConfig;
  vars?: Record<string, string>;
};

export const toProjectConfig = (config: UserConfig): Config => {
  const project: Partial<ProjectConfig> =
    typeof config.project === 'string'
      ? { name: config.project }
      : (config.project as ProjectConfig);

  if (!project.rootDir) {
    project.rootDir = cwd();
  }

  const components: Array<ComponentConfig> = (config.components || []).map(
    (cmp) => {
      return typeof cmp === 'string' ? { name: cmp } : (cmp as ComponentConfig);
    },
  );

  const { defaults, vars } = config;

  return {
    components,
    defaults,
    project: {
      ...project,
    } as ProjectConfig,
    vars,
  };
};

export const validateUserConfig = async (pathOrObject: string | unknown) => {
  const ajv = new Ajv();
  let userConfig: UserConfig;

  if (typeof pathOrObject === 'string') {
    if (await stat(pathOrObject)) {
      const cfgYaml = (await readFile(pathOrObject)).toString();
      userConfig = yaml.parse(cfgYaml.toString()) as UserConfig;
    } else {
      throw new Error(`Could not find file: ${pathOrObject}`);
    }
  } else {
    userConfig = pathOrObject as UserConfig;
  }

  if (!ajv.validate(configSchema, userConfig)) {
    ajv.errors!.forEach((err) => console.error(err));
    throw new Error(`Your .emb.yml is incorrect`);
  }

  config = toProjectConfig(userConfig);

  return config;
};

let config: Config;
export const loadConfig = async (force = false) => {
  if (config && !force) {
    return config;
  }

  const path = await findUp('.emb.yml');

  if (!path) {
    throw new Error('Could not find EMB config anywhere');
  }

  config = toProjectConfig(await validateUserConfig(path));

  return config;
};

export const getConfig = () => {
  if (!config) {
    throw new Error(`Config not loaded, please use 'loadConfig' first`);
  }

  return config;
};
