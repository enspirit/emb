/**
 * Shared setup utilities for real Docker integration tests.
 *
 * Provides hooks to set up a real Docker context (not mocked) and
 * ensure proper cleanup between tests.
 */
import { runCommand } from '@oclif/test';
import { afterAll, afterEach, beforeAll } from 'vitest';

/**
 * Hook to set up real Docker context for a test suite.
 *
 * Usage:
 * ```ts
 * describe('My Docker Test', () => {
 *   useRealDocker();
 *
 *   test('builds an image', async () => {
 *     const { stdout } = await runCommand('resources build simple:image');
 *     expect(stdout).toMatch(/Building/);
 *   });
 * });
 * ```
 */
export function useRealDocker() {
  // eslint-disable-next-line mocha/no-top-level-hooks
  beforeAll(async () => {
    // Ensure clean state before tests
    await cleanupDockerResources();
  });

  // eslint-disable-next-line mocha/no-top-level-hooks
  afterAll(async () => {
    // Clean up after all tests in this suite
    await cleanupDockerResources();
  });

  // eslint-disable-next-line mocha/no-top-level-hooks
  afterEach(async () => {
    // Clean up containers between tests to ensure isolation
    await runCommand('down');
  });
}

/**
 * Clean up Docker resources using EMB's own commands.
 */
async function cleanupDockerResources() {
  try {
    await runCommand('clean --force');
  } catch {
    // Ignore errors - clean might fail if nothing to clean
  }
}

/**
 * Build a resource and verify it succeeds.
 * Helper for tests that need a pre-built image.
 */
export async function buildResource(resourceId: string) {
  const { error } = await runCommand(`resources build ${resourceId}`);
  if (error) {
    throw new Error(`Failed to build ${resourceId}: ${error.message}`);
  }
}

/**
 * Start a component and verify it succeeds.
 * Helper for tests that need a running service.
 */
export async function startComponent(componentName: string) {
  const { error } = await runCommand(`up ${componentName}`);
  if (error) {
    throw new Error(`Failed to start ${componentName}: ${error.message}`);
  }
}
