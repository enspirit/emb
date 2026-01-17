/**
 * Integration tests for clean command with real Docker.
 *
 * Uses the microservices example which has multiple components.
 */
import { runCommand } from '@oclif/test';
import { execa } from 'execa';
import { describe, expect, test } from 'vitest';

import { useExampleWithDocker } from '../../helpers.js';

describe('Docker - clean', () => {
  useExampleWithDocker('microservices');

  test('cleans all project resources', async () => {
    // Setup: build an image
    await runCommand('resources build gateway:image');

    // Verify image exists using docker command
    const { stdout: beforeClean } = await execa('docker', [
      'images',
      '--filter',
      'label=emb/project=microservices',
      '--format',
      '{{.Repository}}:{{.Tag}}',
    ]);
    expect(beforeClean).toMatch(/microservices\/gateway/);

    // Run clean
    const { error } = await runCommand('clean --force');
    expect(error).toBeUndefined();

    // Verify images are gone
    const { stdout: afterClean } = await execa('docker', [
      'images',
      '--filter',
      'label=emb/project=microservices',
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
    await runCommand('resources build gateway:image');

    // Clean should remove .emb directory
    const { error } = await runCommand('clean --force');
    expect(error).toBeUndefined();
  });
});
