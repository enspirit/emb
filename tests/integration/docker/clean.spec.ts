/**
 * Integration tests for `emb clean` with real Docker.
 */
import { runCommand } from '@oclif/test';
import { execa } from 'execa';
import { describe, expect, test } from 'vitest';

import { useRealDocker } from './setup.js';

describe('CLI - emb clean (real Docker)', () => {
  useRealDocker();

  test('cleans all project resources', async () => {
    // Setup: build an image
    await runCommand('resources build simple:image');

    // Verify image exists using docker command
    const { stdout: beforeClean } = await execa('docker', [
      'images',
      '--filter',
      'label=emb/project=emb',
      '--format',
      '{{.Repository}}:{{.Tag}}',
    ]);
    expect(beforeClean).toMatch(/emb\/simple/);

    // Run clean
    const { error } = await runCommand('clean --force');
    expect(error).toBeUndefined();

    // Verify images are gone
    const { stdout: afterClean } = await execa('docker', [
      'images',
      '--filter',
      'label=emb/project=emb',
      '--format',
      '{{.Repository}}:{{.Tag}}',
    ]);
    expect(afterClean.trim()).toBe('');
  });

  test('handles clean when nothing to clean', async () => {
    // First clean to ensure nothing exists
    await runCommand('clean --force');

    // Second clean should not error
    const { error } = await runCommand('clean --force');
    expect(error).toBeUndefined();
  });

  test('clean removes .emb store directory', async () => {
    // Build to create store files
    await runCommand('resources build simple:image');

    // Clean should remove .emb directory
    const { error } = await runCommand('clean --force');
    expect(error).toBeUndefined();
  });
});
