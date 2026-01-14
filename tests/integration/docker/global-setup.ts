/**
 * Global setup for Docker integration tests.
 *
 * Runs ONCE before all Docker integration tests to clean up any
 * leftover resources from previous test runs or crashes.
 */
import { execa } from 'execa';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function globalSetup() {
  const projectRoot = resolve(__dirname, '../../..');

  console.log('[EMB Test Setup] Running pre-test cleanup...');

  try {
    // Run emb clean to handle crash recovery
    // Using the local bin/run.js to ensure we're testing the current code
    await execa('npx', ['tsx', './bin/run.js', 'clean', '--force'], {
      cwd: projectRoot,
      env: { ...process.env, DOCKER_TAG: 'test' },
      stdio: 'inherit',
    });
    console.log('[EMB Test Setup] Cleanup completed successfully');
  } catch {
    // Ignore errors - clean might fail if nothing to clean
    console.log('[EMB Test Setup] Cleanup completed (or nothing to clean)');
  }

  // Return context that will be available in tests via globalThis
  return () => {
    // Teardown function - runs after all tests
    return globalTeardown();
  };
}

async function globalTeardown() {
  const projectRoot = resolve(__dirname, '../../..');

  console.log('[EMB Test Teardown] Running post-test cleanup...');

  try {
    await execa('npx', ['tsx', './bin/run.js', 'clean', '--force'], {
      cwd: projectRoot,
      env: { ...process.env, DOCKER_TAG: 'test' },
      stdio: 'inherit',
    });
    console.log('[EMB Test Teardown] Cleanup complete');
  } catch {
    console.error(
      '[EMB Test Teardown] Cleanup encountered issues (may be expected)',
    );
  }
}
