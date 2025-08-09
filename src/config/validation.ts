import { Ajv } from 'ajv';
import { readFile, stat } from 'node:fs/promises';
import yaml from 'yaml';

import { toProjectConfig } from './convert.js';
import { Component } from './schema.js';
import configSchema from './schema.json' with { type: 'json' };
import { UserConfig } from './types.js';

const ajv = new Ajv();
ajv.addSchema(configSchema);

export const validateUserConfig = async (pathOrObject: string | unknown) => {
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

  return toProjectConfig(userConfig);
};

export const validateEmbfile = async (pathOrObject: string | unknown) => {
  let component: Component;

  if (typeof pathOrObject === 'string') {
    if (await stat(pathOrObject)) {
      const cfgYaml = (await readFile(pathOrObject)).toString();
      component = yaml.parse(cfgYaml.toString()) as Component;
    } else {
      throw new Error(`Could not find file: ${pathOrObject}`);
    }
  } else {
    component = pathOrObject as Component;
  }

  const validate = ajv.getSchema('/schemas/config#/$defs/component');
  if (!validate) {
    throw new Error('Could not find the JSON schema validator for Embfile');
  }

  if (!validate(component)) {
    ajv.errors!.forEach((err) => console.error(err));
    throw new Error(`Your .emb.yml is incorrect`);
  }

  return component;
};
