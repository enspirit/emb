import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';

describe('CLI - emb tasks run', () => {
  test('supports calling a single task (by id)', async () => {
    const { stdout } = await runCommand('tasks run greet');

    expect(stdout).to.match(/Running greet/);
  });

  test('supports calling a single task (by name)', async () => {
    const { stdout } = await runCommand('tasks run greet');

    expect(stdout).to.match(/Running greet/);
  });

  test('fails on unknown task (single)', async () => {
    const { error } = await runCommand('tasks run unknown');

    expect(error?.message).to.match(/Unknown reference `unknown`/);
    expect(error?.code).to.equal('UNKNOWN_REF');
    expect(error?.suggestions).to.include(
      'Check the list of tasks available by running: `emb tasks`',
    );
  });

  test('fails on unknown task (mutiple)', async () => {
    const { error } = await runCommand('tasks run unknown anotherunknown');

    expect(error?.message).to.match(/Unknown reference `unknown`/);
    expect(error?.code).to.equal('UNKNOWN_REF');
    expect(error?.suggestions).to.include(
      'Check the list of tasks available by running: `emb tasks`',
    );
  });

  test('fails on ambiguous task (single)', async () => {
    const { error } = await runCommand('tasks run test');

    expect(error?.message).to.match(
      /Ambiguous reference `test` matches multiple/,
    );
    expect(error?.code).to.equal('AMBIGUOUS_REF');
    expect(error?.suggestions).to.include(
      'Specify just one. Eg: `emb tasks run frontend:test`',
    );
    expect(error?.suggestions).to.include(
      'Run the same command with --all-matches / -a',
    );
    expect(error?.suggestions).to.include(
      'Review the list of tasks by running `emb tasks`',
    );
  });

  test('fails on ambiguous task (multiple)', async () => {
    const { error } = await runCommand('tasks run greet test');

    expect(error?.message).to.match(
      /Ambiguous reference `test` matches multiple/,
    );
    expect(error?.code).to.equal('AMBIGUOUS_REF');
    expect(error?.suggestions).to.include(
      'Run the same command with --all-matches / -a',
    );
    expect(error?.suggestions).to.include(
      'Review the list of tasks by running `emb tasks`',
    );

    const found = error?.suggestions?.find((v: string) =>
      v.match(/Specify just one. Eg: `emb tasks run .+`/),
    );
    expect(found).not.toBeUndefined();
  });
});
