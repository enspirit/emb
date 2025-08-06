import { Ajv } from 'ajv';
import { findUp } from 'find-up';
import yaml from 'yaml';

import configSchema from './schema.json';

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

  const cfgYaml = yaml.parse(path) as Config;
  const validate = ajv.compile(configSchema);
  const valid = validate(cfgYaml);

  if (!valid) {
    throw new Error(`Your .emb.yml is incorrect`);
  }

  console.log('------>', validate);

  config = cfgYaml;

  return config;
};

export const getConfig = () => {
  if (!config) {
    throw new Error(`Config not loaded, please use 'loadConfig' first`);
  }

  return config;
};
