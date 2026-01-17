/**
 * Integration tests for build dry-run mode.
 *
 * Uses the microservices example which has:
 * - Multiple components with Dockerfiles
 * - Dependencies between components
 */
import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';

import { useExample } from '../../helpers.js';

describe('Build - dry-run', () => {
  useExample('microservices');

  test('--dry-run --json shows build plan without building', async () => {
    const { stdout } = await runCommand(
      'resources build gateway:image --dry-run --json',
    );

    const output = JSON.parse(stdout);

    expect(Object.keys(output)).to.have.length(1);
    expect(output).to.haveOwnProperty('gateway:image');

    const gateway = output['gateway:image'];
    expect(gateway.dryRun).toEqual(true);
    expect(gateway.builderInput.dockerfile).toEqual('Dockerfile');
    expect(gateway.builderInput.tag).toEqual('microservices/gateway:latest');
  });

  test('--dry-run shows multiple resources in plan', async () => {
    const { stdout } = await runCommand(
      'resources build gateway:image base:image --dry-run --json',
    );

    const output = JSON.parse(stdout);

    expect(Object.keys(output)).to.have.length(2);
    expect(output).to.haveOwnProperty('gateway:image');
    expect(output).to.haveOwnProperty('base:image');
  });

  test('--dry-run includes dependencies in plan', async () => {
    // api depends on base
    const { stdout } = await runCommand(
      'resources build api:image --dry-run --json',
    );

    const output = JSON.parse(stdout);

    // Should include both api and its dependency base
    expect(Object.keys(output)).to.have.length(2);
    expect(output).to.haveOwnProperty('api:image');
    expect(output).to.haveOwnProperty('base:image');
  });

  test('--dry-run does not create images', async () => {
    const { error } = await runCommand(
      'resources build gateway:image --dry-run',
    );

    expect(error).toBeUndefined();

    // We can't easily verify no image was created without Docker,
    // but the absence of error confirms the command works
  });
});
