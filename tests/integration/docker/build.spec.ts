/**
 * Integration tests for `emb resources build` with real Docker.
 */
import { runCommand } from '@oclif/test';
import { execa } from 'execa';
import { describe, expect, test } from 'vitest';

import { useRealDocker } from './setup.js';

/**
 * Check if a Docker image exists with the EMB project label.
 */
async function imageExists(imageName: string): Promise<boolean> {
  const { stdout } = await execa('docker', [
    'images',
    '--filter',
    'label=emb/project=emb',
    '--format',
    '{{.Repository}}:{{.Tag}}',
  ]);
  return stdout.includes(imageName);
}

describe('CLI - emb resources build (real Docker)', () => {
  useRealDocker();

  test('builds the simple component image', async () => {
    const { error } = await runCommand('resources build simple:image');

    expect(error).toBeUndefined();
    expect(await imageExists('emb/simple')).toBe(true);
  });

  test('builds the base component image', async () => {
    const { error } = await runCommand('resources build base:image');

    expect(error).toBeUndefined();
    expect(await imageExists('emb/base')).toBe(true);
  });

  test('builds dependent images in correct order', async () => {
    // dependent:image depends on base:image
    const { error } = await runCommand('resources build dependent:image');

    expect(error).toBeUndefined();
    // Both should exist since dependent depends on base
    expect(await imageExists('emb/base')).toBe(true);
    expect(await imageExists('emb/dependent')).toBe(true);
  });

  test('respects --force flag to rebuild', async () => {
    // First build
    await runCommand('resources build simple:image');
    expect(await imageExists('emb/simple')).toBe(true);

    // Second build with force should succeed
    const { error } = await runCommand('resources build simple:image --force');

    expect(error).toBeUndefined();
    expect(await imageExists('emb/simple')).toBe(true);
  });

  test('builds multiple resources at once', async () => {
    const { error } = await runCommand(
      'resources build simple:image base:image',
    );

    expect(error).toBeUndefined();
    expect(await imageExists('emb/simple')).toBe(true);
    expect(await imageExists('emb/base')).toBe(true);
  });
});
