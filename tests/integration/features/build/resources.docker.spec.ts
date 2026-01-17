/**
 * Integration tests for resource building with real Docker.
 *
 * Uses the microservices example which has:
 * - base component (shared base image)
 * - api and worker components that depend on base:image
 */
import { runCommand } from '@oclif/test';
import { execa } from 'execa';
import { describe, expect, test } from 'vitest';

import { useExampleWithDocker } from '../../helpers.js';

/**
 * Check if a Docker image exists with the EMB project label.
 */
async function imageExists(
  projectName: string,
  componentName: string,
): Promise<boolean> {
  const { stdout } = await execa('docker', [
    'images',
    '--filter',
    `label=emb/project=${projectName}`,
    '--format',
    '{{.Repository}}:{{.Tag}}',
  ]);
  return stdout.includes(`${projectName}/${componentName}`);
}

describe('Build - resources', () => {
  useExampleWithDocker('microservices');

  test('builds a single component image', async () => {
    const { error } = await runCommand('resources build gateway:image');

    expect(error).toBeUndefined();
    expect(await imageExists('microservices', 'gateway')).toBe(true);
  });

  test('builds the base image', async () => {
    const { error } = await runCommand('resources build base:image');

    expect(error).toBeUndefined();
    expect(await imageExists('microservices', 'base')).toBe(true);
  });

  test('builds dependent images in correct order', async () => {
    // api:image depends on base:image
    const { error } = await runCommand('resources build api:image');

    expect(error).toBeUndefined();
    // Both should exist since api depends on base
    expect(await imageExists('microservices', 'base')).toBe(true);
    expect(await imageExists('microservices', 'api')).toBe(true);
  });

  test('respects --force flag to rebuild', async () => {
    // First build
    await runCommand('resources build gateway:image');
    expect(await imageExists('microservices', 'gateway')).toBe(true);

    // Second build with force should succeed
    const { error } = await runCommand('resources build gateway:image --force');

    expect(error).toBeUndefined();
    expect(await imageExists('microservices', 'gateway')).toBe(true);
  });

  test('builds multiple resources at once', async () => {
    const { error } = await runCommand(
      'resources build gateway:image base:image',
    );

    expect(error).toBeUndefined();
    expect(await imageExists('microservices', 'gateway')).toBe(true);
    expect(await imageExists('microservices', 'base')).toBe(true);
  });
});
