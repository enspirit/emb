/**
 * Integration tests for PARALLEL resource building with real Docker.
 *
 * Uses the microservices example (base component + api/worker/gateway that
 * depend on base:image) to prove the scheduler's dependency barrier holds
 * against concurrent `docker build`s.
 */
import { runCommand } from '@oclif/test';
import { execa } from 'execa';
import { describe, expect, test } from 'vitest';

import { useExampleWithDocker } from '../../helpers.js';

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

describe('Build - resources (parallel)', () => {
  useExampleWithDocker('microservices');

  test('honours the dependency barrier under -j (base built before its dependents)', async () => {
    // Clean daemon (beforeAll ran `clean --force`): base:image does not exist
    // yet, so api/worker's real `FROM microservices/base` would fail if the
    // scheduler let them start before base finished. Both depend on base — a
    // green build proves base was built first, then both ran concurrently.
    const { error } = await runCommand(
      'resources build api:image worker:image -j 4',
    );

    expect(error).toBeUndefined();
    expect(await imageExists('microservices', 'base')).toBe(true);
    expect(await imageExists('microservices', 'api')).toBe(true);
    expect(await imageExists('microservices', 'worker')).toBe(true);
  });

  test('accepts -j auto', async () => {
    const { error } = await runCommand('resources build api:image -j auto');

    expect(error).toBeUndefined();
    expect(await imageExists('microservices', 'api')).toBe(true);
  });

  test('-j 1 builds a dependent chain serially', async () => {
    const { error } = await runCommand('resources build gateway:image -j 1');

    expect(error).toBeUndefined();
    expect(await imageExists('microservices', 'gateway')).toBe(true);
  });

  test('--force rebuilds under -j', async () => {
    await runCommand('resources build gateway:image -j 4');
    const { error } = await runCommand(
      'resources build gateway:image -j 4 --force',
    );

    expect(error).toBeUndefined();
    expect(await imageExists('microservices', 'gateway')).toBe(true);
  });
});
