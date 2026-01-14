/**
 * Integration tests for `emb up` and `emb down` with real Docker.
 */
import { runCommand } from '@oclif/test';
import { execa } from 'execa';
import { describe, expect, test } from 'vitest';

import { useRealDocker } from './setup.js';

/**
 * Check if a container is running for a component.
 * Note: The compose project name is 'examples' (directory name), not 'emb'.
 */
async function isContainerRunning(componentName: string): Promise<boolean> {
  const { stdout } = await execa(
    'docker',
    ['compose', '-p', 'examples', 'ps', '--format', 'json'],
    { cwd: 'examples' },
  );

  if (!stdout.trim()) {
    return false;
  }

  // Docker compose ps outputs one JSON object per line
  const lines = stdout.trim().split('\n');
  for (const line of lines) {
    try {
      const container = JSON.parse(line);
      if (
        container.Service === componentName &&
        container.State === 'running'
      ) {
        return true;
      }
    } catch {
      // Skip malformed lines
    }
  }

  return false;
}

describe('CLI - emb up/down lifecycle (real Docker)', () => {
  useRealDocker();

  test('starts and stops the simple component', async () => {
    // Build first
    await runCommand('resources build simple:image');

    // Start the service
    const { error: upError } = await runCommand('up simple');
    expect(upError).toBeUndefined();

    // Verify it's running
    expect(await isContainerRunning('simple')).toBe(true);

    // Stop it
    const { error: downError } = await runCommand('down');
    expect(downError).toBeUndefined();

    // Verify it's stopped
    expect(await isContainerRunning('simple')).toBe(false);
  });

  test('up builds and starts when image does not exist', async () => {
    // Clean any existing images
    await runCommand('clean --force');

    // Up should build and start
    const { error } = await runCommand('up simple');

    expect(error).toBeUndefined();
    // Should be running
    expect(await isContainerRunning('simple')).toBe(true);
  });

  test('down removes containers', async () => {
    // Build and start
    await runCommand('resources build simple:image');
    await runCommand('up simple');

    // Verify running
    expect(await isContainerRunning('simple')).toBe(true);

    // Down should remove
    await runCommand('down');

    // Verify not running
    expect(await isContainerRunning('simple')).toBe(false);
  });
});
