import { findUp } from 'find-up';
import { dirname } from 'node:path';

import { validateUserConfig } from './validation.js';

export * from './types.js';
export * from './validation.js';

export const loadConfig = async () => {
  const path = await findUp('.emb.yml');

  if (!path) {
    throw new Error('Could not find EMB config anywhere');
  }

  const rootDir = dirname(path);
  const config = await validateUserConfig(path);

  return { rootDir, config };
};
