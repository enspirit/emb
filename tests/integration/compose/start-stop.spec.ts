/**
 * Integration tests for start/stop operations with real Docker.
 */
import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';

import { useRealDocker } from '../docker/setup.js';

describe('CLI - Start/Stop Operations (real Docker)', () => {
  useRealDocker();

  test('stop halts running containers without removing them', async () => {
    await runCommand('resources build simple:image');
    await runCommand('up simple');

    // Stop
    const { error } = await runCommand('stop');
    expect(error).toBeUndefined();

    // Container should exist but be stopped
    const { stdout } = await runCommand('ps --all');
    expect(stdout).toMatch(/simple/);
  });

  test('start resumes stopped containers', async () => {
    await runCommand('resources build simple:image');
    await runCommand('up simple');
    await runCommand('stop');

    // Start again
    const { error } = await runCommand('start simple');
    expect(error).toBeUndefined();

    // Should be running
    const { stdout } = await runCommand('ps');
    expect(stdout).toMatch(/simple/);
  });

  test('stop is idempotent', async () => {
    await runCommand('resources build simple:image');
    await runCommand('up simple');

    // Stop twice should not error
    await runCommand('stop');
    const { error } = await runCommand('stop');
    expect(error).toBeUndefined();
  });
});
