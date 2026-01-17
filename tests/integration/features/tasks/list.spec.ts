/**
 * Integration tests for task listing.
 *
 * Uses the fullstack-app example which has:
 * - Project-level tasks (setup, deps, build)
 * - Component tasks (api:test, api:lint, api:fail, web:test)
 */
import { runCommand } from '@oclif/test';
import { describe, expect, test } from 'vitest';

import { useExample } from '../../helpers.js';

describe('Tasks - list', () => {
  useExample('fullstack-app');

  test('lists all tasks', async () => {
    const { stdout } = await runCommand('tasks');

    // Project-level tasks
    expect(stdout).toMatch(/setup.*Set up the development environment/);
    expect(stdout).toMatch(/deps.*Install project dependencies/);
    expect(stdout).toMatch(/build.*Build the entire project/);

    // Component tasks
    expect(stdout).toMatch(/test\s+api\s+Run API tests\s+api:test/);
    expect(stdout).toMatch(/lint\s+api\s+Run linter on API code\s+api:lint/);
    expect(stdout).toMatch(/fail\s+api\s+A task that will fail\s+api:fail/);
    expect(stdout).toMatch(/test\s+web\s+Run frontend tests\s+web:test/);
  });

  test('lists tasks in JSON format', async () => {
    const { stdout } = await runCommand('tasks --json');

    const result = JSON.parse(stdout);
    expect(result).toBeInstanceOf(Array);

    // Check for project-level task
    expect(result).toContainEqual(
      expect.objectContaining({ name: 'setup', id: 'setup' }),
    );

    // Check for component task
    expect(result).toContainEqual(
      expect.objectContaining({
        name: 'test',
        component: 'api',
        id: 'api:test',
      }),
    );
  });
});
