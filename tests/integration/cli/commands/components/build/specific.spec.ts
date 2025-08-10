import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';

describe('CLI - emb components build <component>', () => {
  test('works with --dry-run --json', async () => {
    const { stdout } = await runCommand(
      'components build simple --dry-run --json',
    );

    const built = JSON.parse(stdout);

    expect(Object.keys(built)).to.have.length(1);
    expect(built).to.haveOwnProperty('simple');

    expect(built.simple.dryRun).toEqual(true);
    expect(built.simple.sentinelFile).toEqual(
      'sentinels/docker/build/simple.built',
    );
    expect(built.simple.build.dockerfile).toEqual('Dockerfile');
    expect(built.simple.build.name).toEqual('emb/simple');
    expect(built.simple.build.tag).toEqual('latest');
  });
});
