import { Ajv } from 'ajv';
import { JTDDataType } from 'ajv/dist/core.js';
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

export type Config = {
  project: string | { name: string };
};

type UserConfig = JTDDataType<typeof configSchema>;

export type ProjectConfig = {
  project: {
    name: string;
  };
};

export const toProjectConfig = (config: UserConfig): ProjectConfig => {
  return {
    project: {
      name:
        typeof config.project === 'string'
          ? config.project
          : (config.project as { name: string }).name,
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

  const ajv = new Ajv();
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
