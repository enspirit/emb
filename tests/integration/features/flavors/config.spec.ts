/**
 * Integration tests for flavors feature.
 *
 * Uses the production-ready example which has:
 * - Project-level flavors (staging, production)
 * - Environment variable overrides per flavor
 * - Docker target changes per flavor
 */
import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';

import { useExample } from '../../helpers.js';

describe('Flavors - config', () => {
  useExample('production-ready');

  test('default config has development docker target', async () => {
    const { stdout } = await runCommand('config print --json');

    const config = JSON.parse(stdout);
    // defaults.docker.target is a literal value
    expect(config.defaults.docker.target).toEqual('development');
  });

  test('staging flavor overrides environment variables', async () => {
    const { stdout } = await runCommand('config print --json --flavor staging');

    const config = JSON.parse(stdout);
    // After flavor patches are applied, env values are literal
    expect(config.env.NODE_ENV).toEqual('staging');
    expect(config.env.LOG_LEVEL).toEqual('info');
  });

  test('production flavor changes docker target', async () => {
    const { stdout } = await runCommand(
      'config print --json --flavor production',
    );

    const config = JSON.parse(stdout);
    expect(config.env.NODE_ENV).toEqual('production');
    expect(config.env.LOG_LEVEL).toEqual('warn');
    expect(config.defaults.docker.target).toEqual('production');
  });

  test('lists available flavors', async () => {
    const { stdout } = await runCommand('config print --json');

    const config = JSON.parse(stdout);
    expect(config.flavors).toHaveProperty('staging');
    expect(config.flavors).toHaveProperty('production');
  });
});
