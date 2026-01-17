/**
 * Integration tests for auto-discovery feature.
 *
 * Uses the hello-world example which has minimal config
 * and relies on autodocker plugin to discover components.
 */
import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';

import { useExample } from '../../helpers.js';

describe('Auto-discovery', () => {
  useExample('hello-world');

  test('discovers components with Dockerfiles', async () => {
    const { stdout } = await runCommand('components');

    expect(stdout).toContain('api');
  });

  test('lists discovered component in JSON format', async () => {
    const { stdout } = await runCommand('components --json');

    const result = JSON.parse(stdout);
    // JSON output is an array of components
    expect(result).toBeInstanceOf(Array);
    expect(result).toContainEqual(
      expect.objectContaining({ component: 'api' }),
    );
  });
});
