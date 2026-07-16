/**
 * Vitest Workspace Configuration
 *
 * Note: This file uses the deprecated `defineWorkspace` API. The recommended
 * approach is to use `test.projects` in vite.config.ts, but the migration
 * causes path resolution issues with the tsconfig paths. This will be
 * addressed when Vitest provides better project inheritance.
 */
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineWorkspace } from 'vitest/config';

const sharedConfig = {
  plugins: [
    tsconfigPaths({
      // Ignore errors from website/tsconfig.json which extends astro/tsconfigs/strict
      // (Astro is not installed in the main project, only in the website workspace)
      ignoreConfigErrors: true,
    }),
  ],
  resolve: {
    // Path aliases are resolved by the tsconfigPaths() plugin above, which
    // reads tsconfig.json's `paths` and correctly remaps `.js` import
    // specifiers to their `.ts` source. The previous hand-written alias map
    // prefix-matched barrel entries (e.g. `@/config`), mangling subpath
    // imports like `@/config/index.js` into `.../src/config/index.js/index.js`
    // and making the whole CLI command graph unloadable under vitest.
    extensions: ['.js', '.ts', '.json'],
  },
};

export default defineWorkspace([
  {
    // Unit tests with mocked context
    ...sharedConfig,
    test: {
      name: 'unit',
      include: ['tests/unit/**/*.spec.ts'],
      disableConsoleIntercept: true,
      setupFiles: ['tsx/esm', './tests/setup/set.context.ts'],
    },
  },
  {
    // Feature-based integration tests using example monorepos (no Docker)
    ...sharedConfig,
    test: {
      name: 'integration-features',
      include: ['tests/integration/features/**/*.spec.ts'],
      exclude: ['tests/integration/features/**/*.docker.spec.ts'],
      disableConsoleIntercept: true,
      setupFiles: ['tsx/esm'],
      // Longer timeout for CI environments which may be slower
      testTimeout: 30_000,
    },
  },
  {
    // Feature-based integration tests that require real Docker
    ...sharedConfig,
    test: {
      name: 'integration-features-docker',
      include: ['tests/integration/features/**/*.docker.spec.ts'],
      disableConsoleIntercept: true,
      // Sequential execution to avoid Docker conflicts
      pool: 'forks',
      poolOptions: {
        forks: { singleFork: true },
      },
      // Longer timeout for Docker operations
      testTimeout: 120_000,
      // `clean --force` (image removal) in setup/teardown can exceed the
      // default 10s hook timeout.
      hookTimeout: 120_000,
    },
  },
  {
    // Vault secrets integration tests
    ...sharedConfig,
    test: {
      name: 'integration-secrets',
      include: ['tests/integration/secrets/**/*.spec.ts'],
      disableConsoleIntercept: true,
      setupFiles: ['tsx/esm'],
      globalSetup: './tests/integration/secrets/global-setup.ts',
      // Sequential execution to avoid conflicts
      pool: 'forks',
      poolOptions: {
        forks: { singleFork: true },
      },
      // Longer timeout for container operations
      testTimeout: 60_000,
    },
  },
]);
