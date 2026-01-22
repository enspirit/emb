/**
 * Vitest Configuration
 *
 * Updated for Vitest 4.x using the new `test.projects` API.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sharedConfig = {
  plugins: [
    tsconfigPaths({
      // Ignore errors from website/tsconfig.json which extends astro/tsconfigs/strict
      // (Astro is not installed in the main project, only in the website workspace)
      ignoreConfigErrors: true,
    }),
  ],
  resolve: {
    alias: {
      '@/': resolve(__dirname, './src/'),
      '@/cli': resolve(__dirname, './src/cli/index.js'),
      '@/config': resolve(__dirname, './src/config/index.js'),
      '@/docker': resolve(__dirname, './src/docker/index.js'),
      '@/monorepo': resolve(__dirname, './src/monorepo/index.js'),
      '@/operations': resolve(__dirname, './src/operations/index.js'),
      '@/prerequisites': resolve(__dirname, './src/prerequisites/index.js'),
      '@/utils': resolve(__dirname, './src/utils/index.js'),
    },
    extensions: ['.js', '.ts', '.json'],
  },
};

export default defineConfig({
  test: {
    projects: [
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
          singleFork: true,
          // Longer timeout for Docker operations
          testTimeout: 120_000,
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
          singleFork: true,
          // Longer timeout for container operations
          testTimeout: 60_000,
        },
      },
    ],
  },
});
