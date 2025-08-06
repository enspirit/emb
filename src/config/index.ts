import { Ajv } from 'ajv';
import { findUp } from 'find-up';
import { readFile } from 'node:fs/promises';
import yaml from 'yaml';

import configSchema from './schema.json' with { type: 'json' };

export type Component = {
  name: string;
};

export type Service = {
  name: string;
};

export type Config = {
  project: { name: string };
};

let config: Config;
export const loadConfig = async (force = false) => {
  if (config && !force) {
    return config;
  }

  const ajv = new Ajv();
  const path = await findUp('.emb.yml');

  if (!path) {
    throw new Error('Could not find EMB config anywhere');
  }

  const cfgYaml = await readFile(path);
  config = yaml.parse(cfgYaml.toString()) as Config;

  if (!ajv.validate(configSchema, config)) {
    throw new Error(`Your .emb.yml is incorrect`);
  }

  return config;
};

export const getConfig = () => {
  if (!config) {
    throw new Error(`Config not loaded, please use 'loadConfig' first`);
  }

  return config;
};
