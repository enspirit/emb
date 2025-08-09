import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';
import YAML from 'yaml';

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
});
