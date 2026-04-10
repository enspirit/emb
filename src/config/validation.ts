import { Ajv, ErrorObject } from 'ajv';
import { readFile, stat } from 'node:fs/promises';
import yaml from 'yaml';

import { ConfigValidationError } from '@/errors.js';

import configSchema from './schema.json' with { type: 'json' };
import { ComponentConfig, EMBConfig } from './types.js';

const ajv = new Ajv({ allErrors: true });
ajv.addSchema(configSchema);

function formatAjvErrors(errors: ErrorObject[]): string[] {
  return errors.map((err) => {
    const path = err.instancePath || '/';
    if (
      err.keyword === 'additionalProperties' &&
      err.params?.additionalProperty
    ) {
      return `${path}: unknown property '${err.params.additionalProperty}'`;
    }

    return `${path}: ${err.message}`;
  });
}

export const validateUserConfig = async (
  pathOrObject: string | unknown,
): Promise<EMBConfig> => {
  let embConfig: EMBConfig;
  const file = typeof pathOrObject === 'string' ? pathOrObject : '.emb.yml';

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
    const errors = formatAjvErrors(ajv.errors || []);
    throw new ConfigValidationError([{ file, errors }]);
  }

  return embConfig;
};

export const validateEmbfile = async (pathOrObject: string | unknown) => {
  let component: ComponentConfig;
  const file = typeof pathOrObject === 'string' ? pathOrObject : 'Embfile';

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

  const validate = ajv.getSchema(
    '/schemas/config#/definitions/ComponentConfig',
  );
  if (!validate) {
    throw new Error('Could not find the JSON schema validator for Embfile');
  }

  if (!component) {
    return {};
  }

  if (!validate(component)) {
    const errors = formatAjvErrors(validate.errors || []);
    throw new ConfigValidationError([{ file, errors }]);
  }

  return component;
};
