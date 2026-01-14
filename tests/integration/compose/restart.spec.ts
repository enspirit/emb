/**
 * Integration tests for restart operations with real Docker.
 */
import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';

import { useRealDocker } from '../docker/setup.js';

describe('CLI - Restart Operations (real Docker)', () => {
  useRealDocker();

  test('restart recreates containers', async () => {
    await runCommand('resources build simple:image');
    await runCommand('up simple');

    // Restart
    const { error } = await runCommand('restart simple');
    expect(error).toBeUndefined();

    // Container should be running
    const { stdout } = await runCommand('ps');
    expect(stdout).toMatch(/simple/);
  });

  test('restart works on stopped containers', async () => {
    await runCommand('resources build simple:image');
    await runCommand('up simple');
    await runCommand('stop');

    // Restart from stopped state
    const { error } = await runCommand('restart simple');
    expect(error).toBeUndefined();

    // Should be running again
    const { stdout } = await runCommand('ps');
    expect(stdout).toMatch(/simple/);
  });

  test('restart with --no-deps flag', async () => {
    await runCommand('resources build simple:image');
    await runCommand('up simple');

    // Restart without dependencies
    const { error } = await runCommand('restart simple --no-deps');
    expect(error).toBeUndefined();

    // Should be running
    const { stdout } = await runCommand('ps');
    expect(stdout).toMatch(/simple/);
  });
});
