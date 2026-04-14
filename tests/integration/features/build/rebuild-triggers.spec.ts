/**
 * Integration tests for flavor-aware rebuild triggers.
 *
 * Confirms that --flavor propagates through the CLI layer to the new
 * rebuildPolicy field on docker/image resources, and that resource-level
 * rebuildTrigger overrides win against the flavor default.
 */
import { runCommand } from '@oclif/test';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';

import { EXAMPLES, useExample } from '../../helpers.js';

describe('Build - rebuild triggers', () => {
  useExample('rebuild-triggers');

  beforeEach(() => {
    rmSync(resolve(EXAMPLES['rebuild-triggers'], '.emb'), {
      recursive: true,
      force: true,
    });
  });

  test('--flavor dev applies the flavor-level watch-paths default to api', async () => {
    const { stdout } = await runCommand(
      'resources build api:image --flavor dev --dry-run --json',
    );

    const output = JSON.parse(stdout);
    const api = output['api:image'];

    expect(api.sentinelData).toMatchObject({
      strategy: 'watch-paths',
      source: 'flavor',
    });
  });

  test('resource-level rebuildTrigger=always on docs-scraper wins over the flavor default', async () => {
    const { stdout } = await runCommand(
      'resources build docs-scraper:image --flavor dev --dry-run --json',
    );

    const output = JSON.parse(stdout);
    const scraper = output['docs-scraper:image'];

    expect(scraper.sentinelData).toMatchObject({
      strategy: 'always',
      source: 'resource',
    });
  });
});
