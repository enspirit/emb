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

/**
 * Load and parse a YAML config document.
 *
 * When `pathOrObject` is already an object it is returned as-is; when it is a
 * path the file is read and parsed. A missing file surfaces the friendly
 * "Could not find file" message rather than a raw ENOENT (stat() resolves to a
 * truthy Stats object or rejects — it is never falsy). An empty or
 * comments-only document parses to `null`/`undefined`, which each caller
 * interprets for itself.
 */
async function loadYamlDocument(
  pathOrObject: string | unknown,
): Promise<unknown> {
  if (typeof pathOrObject !== 'string') {
    return pathOrObject;
  }

  try {
    await stat(pathOrObject);
  } catch {
    throw new Error(`Could not find file: ${pathOrObject}`);
  }

  const contents = (await readFile(pathOrObject)).toString();
  return yaml.parse(contents);
}

export const validateUserConfig = async (
  pathOrObject: string | unknown,
): Promise<EMBConfig> => {
  const file = typeof pathOrObject === 'string' ? pathOrObject : '.emb.yml';
  const embConfig = (await loadYamlDocument(pathOrObject)) as EMBConfig;

  // An empty (0-byte or comments-only) file parses to null. Report it as
  // empty rather than letting Ajv emit the opaque "/: must be object".
  if (!embConfig) {
    throw new Error(`Configuration file is empty: ${file}`);
  }

  if (!ajv.validate(configSchema, embConfig)) {
    const errors = formatAjvErrors(ajv.errors || []);
    throw new ConfigValidationError([{ file, errors }]);
  }

  return embConfig;
};

export const validateEmbfile = async (pathOrObject: string | unknown) => {
  const file = typeof pathOrObject === 'string' ? pathOrObject : 'Embfile';
  const component = (await loadYamlDocument(pathOrObject)) as ComponentConfig;

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
