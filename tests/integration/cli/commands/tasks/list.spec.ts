import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';

describe('CLI - emb tasks', () => {
  test('prints the correct list of tasks', async () => {
    const { stdout } = await runCommand('tasks');

    expect(stdout).to.match(/dependent\s+global:dependent/);
    expect(stdout).to.match(/prereq\s+global:prereq/);
    expect(stdout).to.match(/ps\s+global:ps/);
    expect(stdout).to.match(
      /fail\s+frontend\s+A task that will fail\s+frontend:fail/,
    );
    expect(stdout).to.match(
      /test\s+frontend\s+A simple unit test task\s+frontend:test/,
    );
    expect(stdout).to.match(/test\s+buildargs\s+buildargs:test/);
    expect(stdout).to.match(
      /fail\s+frontend\s+A task that will fail\s+frontend:fail/,
    );
  });
});
