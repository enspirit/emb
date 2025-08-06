import { Ajv } from 'ajv';
import { JSONSchemaType, JTDDataType } from 'ajv/dist/core.js';
import { findUp } from 'find-up';
import { readFile, stat } from 'node:fs/promises';
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
  project: string | { name: string };
};

export type ProjectConfig = {
  name: string;
  rootDir?: string;
};

export type ComponentConfig = {
  name: string;
};

export type Config = {
  components: Array<ComponentConfig>;
  project: ProjectConfig;
};

export const toProjectConfig = (config: UserConfig): Config => {
  const project: ProjectConfig =
    typeof config.project === 'string'
      ? { name: config.project }
      : (config.project as ProjectConfig);

  const components: Array<ComponentConfig> = (config.components || []).map(
    (cmp) => {
      return typeof cmp === 'string' ? { name: cmp } : (cmp as ComponentConfig);
    },
  );

  return {
    components,
    project: {
      ...project,
    },
  };
};

export const validateConfig = async (pathOrObject: string | unknown) => {
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

let config: UserConfig;
export const loadConfig = async (force = false) => {
  if (config && !force) {
    return config;
  }

  const path = await findUp('.emb.yml');

  if (!path) {
    throw new Error('Could not find EMB config anywhere');
  }

  config = toProjectConfig(await validateConfig(path));

  return config;
};

export const getConfig = () => {
  if (!config) {
    throw new Error(`Config not loaded, please use 'loadConfig' first`);
  }

  return config;
};
