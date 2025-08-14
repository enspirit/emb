import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';
import YAML from 'yaml';

import { validateUserConfig } from '@/config';
import { Monorepo, MonorepoConfig } from '@/monorepo';

describe('CLI - emb config print', () => {
  test('works with --json mode', async () => {
    const { stdout } = await runCommand('config print --json');

    const config = JSON.parse(stdout);

    expect(config.project.name).to.equal('emb');
    expect(Object.keys(config.components).length).to.equal(7);
  });

  test('works on yaml mode (default)', async () => {
    const { stdout } = await runCommand('config print');

    const config = YAML.parse(stdout);

    expect(config.project.name).to.equal('emb');
    expect(Object.keys(config.components).length).to.equal(7);
  });

  test('supports --flavor', async () => {
    const { stdout } = await runCommand('config print --flavor production');

    const config = YAML.parse(stdout);
    expect(config.project.name).to.equal('emb');
    expect(Object.keys(config.components).length).to.equal(7);

    // Frontend has overrides for that flavor
    const { frontend } = config.components;
    expect(frontend.resources.image.params.target).to.equal('production');
  });

  test.skip('dumps a valid config file that can be reused', async () => {
    const { stdout } = await runCommand('config print --json');

    const json = JSON.parse(stdout);

    // No raise
    await expect(() => validateUserConfig(json)).not.toThrow();
    const config = new MonorepoConfig(json);
    await expect(() => new Monorepo(config, '/tmp/monorepo')).not.toThrow();
  });
});
