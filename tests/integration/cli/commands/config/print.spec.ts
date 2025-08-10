import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';
import YAML from 'yaml';

import { ComponentConfig } from '@/config/types.js';

describe('CLI - emb config print', () => {
  test('works on --json mode', async () => {
    const { stdout } = await runCommand('config print --json');

    const config = JSON.parse(stdout);

    expect(config.project.name).to.equal('emb');
    expect(config.components.length).to.equal(6);
  });

  test('works on yaml mode (default)', async () => {
    const { stdout } = await runCommand('config print');

    const config = YAML.parse(stdout);

    expect(config.project.name).to.equal('emb');
    expect(config.components.length).to.equal(6);
  });

  test('supports --flavor', async () => {
    const { stdout } = await runCommand('config print --flavor production');

    const config = YAML.parse(stdout);

    expect(config.project.name).to.equal('emb');
    expect(config.components.length).to.equal(6);

    // Frontend has overrides for that flavor
    const frontend = config.components.find(
      (c: ComponentConfig) => c.name === 'frontend',
    );
    expect(frontend.docker.target).to.equal('production');
  });
});
