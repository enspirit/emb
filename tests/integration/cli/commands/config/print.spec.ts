import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';

describe('CLI - emb config print', () => {
  test('works', async () => {
    const { stdout } = await runCommand('config print');

    const config = JSON.parse(stdout);

    expect(config.project.name).to.equal('emb');
    expect(config.components.length).to.equal(6);
  });
});
