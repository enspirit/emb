/**
 * Integration tests for `emb ps` with real Docker.
 */
import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';

import { useRealDocker } from './setup.js';

describe('CLI - emb ps (real Docker)', () => {
  useRealDocker();

  test('shows running containers', async () => {
    // Build and start
    await runCommand('resources build simple:image');
    await runCommand('up simple');

    // Check ps output
    const { stdout } = await runCommand('ps');
    expect(stdout).toMatch(/simple/);
  });

  test('shows no containers when none are running', async () => {
    // Ensure clean state
    await runCommand('down');

    // Check ps output
    const { stdout } = await runCommand('ps');
    // Should show empty or header only
    expect(stdout).not.toMatch(/running/i);
  });

  test('shows stopped containers with --all flag', async () => {
    // Build, start, then stop
    await runCommand('resources build simple:image');
    await runCommand('up simple');
    await runCommand('stop');

    // Without --all should not show stopped
    const { stdout: withoutAll } = await runCommand('ps');
    expect(withoutAll).not.toMatch(/simple.*running/i);

    // With --all should show
    const { stdout: withAll } = await runCommand('ps --all');
    expect(withAll).toMatch(/simple/);
  });
});
