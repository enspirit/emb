import { findUp } from 'find-up';
import yaml from 'yaml';

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

  const path = await findUp('.emb.yml');

  if (!path) {
    throw new Error('Could not find EMB config anywhere');
  }

  config = yaml.parse(path) as Config;

  return config;
};

export const getConfig = () => {
  if (!config) {
    throw new Error(`Config not loaded, please use 'loadConfig' first`);
  }

  return config;
};
