import { Ajv } from 'ajv';
import { readFile, stat } from 'node:fs/promises';
import yaml from 'yaml';

import { toProjectConfig } from './convert.js';
import configSchema from './schema.json' with { type: 'json' };
import { UserConfig } from './types.js';

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

  return toProjectConfig(userConfig);
};
