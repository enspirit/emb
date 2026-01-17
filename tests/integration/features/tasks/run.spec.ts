/**
 * Integration tests for task execution.
 *
 * Uses the fullstack-app example which has:
 * - Project-level tasks (setup, deps, build)
 * - Component tasks (api:test, api:lint, api:fail, web:test)
 */
import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';

import { useExample } from '../../helpers.js';

describe('Tasks - run', () => {
  useExample('fullstack-app');

  test('runs a project-level task by name', async () => {
    const { stdout } = await runCommand('tasks run setup');

    expect(stdout).toMatch(/Running setup/);
  });

  test('runs a component task by full id', async () => {
    const { stdout } = await runCommand('tasks run api:test');

    expect(stdout).toMatch(/Running api:test/);
  });

  test('fails on unknown task', async () => {
    const { error } = await runCommand('tasks run unknown');

    expect(error?.message).toMatch(/Unknown reference `unknown`/);
    expect(error?.code).toEqual('UNKNOWN_REF');
    expect(error?.suggestions).toContain(
      'Check the list of tasks available by running: `emb tasks`',
    );
  });

  test('fails on ambiguous task reference', async () => {
    // 'test' exists in both api and web components
    const { error } = await runCommand('tasks run test');

    expect(error?.message).toMatch(
      /Ambiguous reference `test` matches multiple/,
    );
    expect(error?.code).toEqual('AMBIGUOUS_REF');
    expect(error?.suggestions).toContain(
      'Run the same command with --all-matching / -a',
    );
  });

  test('runs task with pre-dependencies', async () => {
    const { stdout } = await runCommand('tasks run build');

    // Should run deps first (prerequisite), then build
    expect(stdout).toMatch(/Running deps/);
    expect(stdout).toMatch(/Running build/);
  });
});
