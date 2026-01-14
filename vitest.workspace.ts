/**
 * Vitest Workspace Configuration
 *
 * Note: This file uses the deprecated `defineWorkspace` API. The recommended
 * approach is to use `test.projects` in vite.config.ts, but the migration
 * causes path resolution issues with the tsconfig paths. This will be
 * addressed when Vitest provides better project inheritance.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineWorkspace } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sharedConfig = {
  plugins: [tsconfigPaths()],
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
    // Mocked CLI integration tests (existing behavior)
    ...sharedConfig,
    test: {
      name: 'integration-mocked',
      include: ['tests/integration/cli/**/*.spec.ts'],
      disableConsoleIntercept: true,
      setupFiles: ['tsx/esm', './tests/setup/set.context.ts'],
    },
  },
  {
    // Real Docker integration tests (sequential execution)
    ...sharedConfig,
    test: {
      name: 'integration-docker',
      include: ['tests/integration/docker/**/*.spec.ts'],
      disableConsoleIntercept: true,
      setupFiles: ['tsx/esm'],
      globalSetup: './tests/integration/docker/global-setup.ts',
      // Sequential execution to avoid Docker conflicts
      pool: 'forks',
      poolOptions: {
        forks: { singleFork: true },
      },
      // Longer timeout for Docker operations
      testTimeout: 120_000,
    },
  },
  {
    // Docker Compose operation tests
    ...sharedConfig,
    test: {
      name: 'integration-compose',
      include: ['tests/integration/compose/**/*.spec.ts'],
      disableConsoleIntercept: true,
      setupFiles: ['tsx/esm'],
      globalSetup: './tests/integration/docker/global-setup.ts',
      // Sequential execution to avoid Docker conflicts
      pool: 'forks',
      poolOptions: {
        forks: { singleFork: true },
      },
      // Longer timeout for Docker operations
      testTimeout: 120_000,
    },
  },
]);
