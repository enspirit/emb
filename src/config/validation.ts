import { Ajv } from 'ajv';
import { readFile, stat } from 'node:fs/promises';
import yaml from 'yaml';

import configSchema from './schema.json' with { type: 'json' };
import { ComponentConfig, EMBConfig } from './types.js';

const ajv = new Ajv();
ajv.addSchema(configSchema);

export const validateUserConfig = async (
  pathOrObject: string | unknown,
): Promise<EMBConfig> => {
  let embConfig: EMBConfig;

  if (typeof pathOrObject === 'string') {
    if (await stat(pathOrObject)) {
      const cfgYaml = (await readFile(pathOrObject)).toString();
      embConfig = yaml.parse(cfgYaml.toString()) as EMBConfig;
    } else {
      throw new Error(`Could not find file: ${pathOrObject}`);
    }
  } else {
    embConfig = pathOrObject as EMBConfig;
  }

  if (!ajv.validate(configSchema, embConfig)) {
    ajv.errors?.forEach((err) => console.error(err));
    throw new Error(`Your .emb.yml is incorrect`);
  }

  return embConfig;
};

export const validateEmbfile = async (pathOrObject: string | unknown) => {
  let component: ComponentConfig;

  if (typeof pathOrObject === 'string') {
    if (await stat(pathOrObject)) {
      const cfgYaml = (await readFile(pathOrObject)).toString();
      component = yaml.parse(cfgYaml.toString()) as ComponentConfig;
    } else {
      throw new Error(`Could not find file: ${pathOrObject}`);
    }
  } else {
    component = pathOrObject as ComponentConfig;
  }

  const validate = ajv.getSchema('/schemas/config#/$defs/ComponentConfig');
  if (!validate) {
    throw new Error('Could not find the JSON schema validator for Embfile');
  }

  if (!component) {
    return {};
  }

  if (!validate(component)) {
    ajv.errors?.forEach((err) => console.error(err));
    throw new Error(`Your .emb.yml is incorrect`);
  }

  return component;
};
