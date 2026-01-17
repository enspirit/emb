/**
 * Shared test helpers for integration tests.
 *
 * Provides utilities for targeting specific example monorepos
 * and managing test environment setup.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));

/**
 * Available example monorepos for testing.
 *
 * Each example demonstrates different EMB features:
 * - fullstack-app: Tasks, docker-compose, env vars
 * - hello-world: Minimal config, auto-discovery
 * - microservices: Dependencies, build ordering, advanced tasks
 * - production-ready: Flavors, multi-stage builds
 */
export type ExampleName =
  | 'fullstack-app'
  | 'hello-world'
  | 'microservices'
  | 'production-ready';

/**
 * Path constants for example monorepos.
 */
export const EXAMPLES = {
  'fullstack-app': resolve(currentDir, '../../examples/fullstack-app'),
  'hello-world': resolve(currentDir, '../../examples/hello-world'),
  microservices: resolve(currentDir, '../../examples/microservices'),
  'production-ready': resolve(currentDir, '../../examples/production-ready'),
} as const;

/**
 * Hook to set the EMB_ROOT environment variable for a test suite.
 *
 * This allows tests to target a specific example monorepo without
 * relying on a root .emb.yml file.
 *
 * Usage:
 * ```ts
 * describe('Auto-discovery', () => {
 *   useExample('hello-world');
 *
 *   test('discovers components with Dockerfiles', async () => {
 *     const { stdout } = await runCommand('components');
 *     expect(stdout).toContain('api');
 *   });
 * });
 * ```
 *
 * @param name - The example monorepo to use
 */
export function useExample(name: ExampleName) {
  let previousEmbRoot: string | undefined;

  // eslint-disable-next-line mocha/no-top-level-hooks
  beforeAll(() => {
    // Save previous value (if any) to restore later
    previousEmbRoot = process.env.EMB_ROOT;
    process.env.EMB_ROOT = EXAMPLES[name];
  });

  // eslint-disable-next-line mocha/no-top-level-hooks
  afterAll(() => {
    // Restore previous value or delete
    if (previousEmbRoot === undefined) {
      delete process.env.EMB_ROOT;
    } else {
      process.env.EMB_ROOT = previousEmbRoot;
    }
  });
}

/**
 * Get the absolute path to an example monorepo.
 *
 * @param name - The example name
 * @returns Absolute path to the example directory
 */
export function getExamplePath(name: ExampleName): string {
  return EXAMPLES[name];
}

/**
 * Hook to set up an example with Docker cleanup.
 *
 * Combines useExample() with Docker resource cleanup for tests that
 * actually build images or run containers.
 *
 * Usage:
 * ```ts
 * describe('Docker Build', () => {
 *   useExampleWithDocker('fullstack-app');
 *
 *   test('builds api image', async () => {
 *     const { error } = await runCommand('resources build api:image');
 *     expect(error).toBeUndefined();
 *   });
 * });
 * ```
 *
 * @param name - The example monorepo to use
 */
export function useExampleWithDocker(name: ExampleName) {
  // Import runCommand dynamically to avoid circular deps
  let runCommand: typeof import('@oclif/test').runCommand;
  let rmSync: typeof import('node:fs').rmSync;

  // eslint-disable-next-line mocha/no-top-level-hooks, mocha/no-sibling-hooks
  beforeAll(async () => {
    const oclif = await import('@oclif/test');
    const fs = await import('node:fs');
    runCommand = oclif.runCommand;
    rmSync = fs.rmSync;

    // Set example root
    process.env.EMB_ROOT = EXAMPLES[name];

    // Remove any existing .emb cache folder to ensure clean state
    try {
      rmSync(resolve(EXAMPLES[name], '.emb'), { recursive: true, force: true });
    } catch {
      // Ignore errors
    }

    // Clean up any existing Docker resources
    try {
      await runCommand('clean --force');
    } catch {
      // Ignore errors - clean might fail if nothing to clean
    }
  });

  // eslint-disable-next-line mocha/no-top-level-hooks, mocha/no-sibling-hooks
  afterAll(async () => {
    // Clean up Docker resources
    try {
      await runCommand('clean --force');
    } catch {
      // Ignore errors
    }

    delete process.env.EMB_ROOT;
  });

  // eslint-disable-next-line mocha/no-top-level-hooks
  afterEach(async () => {
    // Stop containers between tests
    try {
      await runCommand('down');
    } catch {
      // Ignore errors
    }
  });
}
