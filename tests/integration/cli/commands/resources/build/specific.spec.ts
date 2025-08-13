import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';

describe('CLI - emb resources build <resource>', () => {
  test('works with --dry-run --json', async () => {
    const { stdout } = await runCommand(
      'resources build frontend:image --dry-run --json',
    );

    const output = JSON.parse(stdout);

    expect(Object.keys(output)).to.have.length(1);
    expect(output).to.haveOwnProperty('frontend:image');

    const frontend = output['frontend:image'];
    expect(frontend.dryRun).toEqual(true);

    expect(frontend.builder.input.dockerfile).toEqual('Dockerfile');
    expect(frontend.builder.input.tag).toEqual('emb/frontend:latest');
    expect(frontend.builder.input.target).toEqual('development');
  });
});
