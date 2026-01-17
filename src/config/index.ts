import { findUp } from 'find-up';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { validateUserConfig } from './validation.js';

export * from './types.js';
export * from './validation.js';

export interface LoadConfigOptions {
  /**
   * Explicit root directory path. Takes precedence over EMB_ROOT env var.
   * Can be either:
   * - A directory containing .emb.yml
   * - A direct path to a .emb.yml file
   */
  root?: string;
}

export const loadConfig = async (options: LoadConfigOptions = {}) => {
  let path: string | undefined;

  // Priority 1: Explicit root option (from --root/-C flag)
  // Priority 2: EMB_ROOT environment variable
  // Priority 3: Walk up to find .emb.yml (original behavior)
  const explicitRoot = options.root || process.env.EMB_ROOT;

  if (explicitRoot) {
    const resolved = resolve(explicitRoot);

    // Check if it's a direct path to a config file
    if (resolved.endsWith('.emb.yml') && existsSync(resolved)) {
      path = resolved;
    } else {
      // Assume it's a directory, look for .emb.yml inside
      const configPath = join(resolved, '.emb.yml');
      if (existsSync(configPath)) {
        path = configPath;
      } else {
        throw new Error(
          `Could not find .emb.yml in specified root: ${explicitRoot}`,
        );
      }
    }
  } else {
    path = await findUp('.emb.yml');
  }

  if (!path) {
    throw new Error('Could not find EMB config anywhere');
  }

  const rootDir = dirname(path);
  const config = await validateUserConfig(path);

  return { rootDir, config };
};
