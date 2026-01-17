import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, test } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));
const examplePath = resolve(currentDir, '../../../../examples/fullstack-app');

/**
 * Integration tests for bash tab completion.
 *
 * These tests verify that the CLI's bash completion works correctly by:
 * 1. Generating the completion scripts via `emb autocomplete bash`
 * 2. Sourcing the generated bash completion function
 * 3. Simulating tab completion by setting COMP_WORDS/COMP_CWORD
 * 4. Verifying COMPREPLY contains expected completions
 *
 * Uses the fullstack-app example which has tasks: setup, deps, build,
 * api:test, api:lint, api:fail, web:test
 */
// Skip: These tests depend on cached completion scripts which are fragile in CI
// Run manually with: npx vitest run tests/integration/features/autocomplete/bash.spec.ts
describe.skip('CLI - bash autocomplete', () => {
  let completionScriptPath: string;

  beforeAll(() => {
    // Generate the autocomplete cache
    execSync('./bin/run.js autocomplete bash', {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: { ...process.env, EMB_ROOT: examplePath },
    });

    // Find the completion script path (macOS vs Linux cache location)
    const possiblePaths = [
      join(
        homedir(),
        'Library/Caches/emb/autocomplete/functions/bash/emb.bash',
      ), // macOS
      join(homedir(), '.cache/emb/autocomplete/functions/bash/emb.bash'), // Linux
    ];

    completionScriptPath = possiblePaths.find((p) => existsSync(p)) || '';

    if (!completionScriptPath) {
      throw new Error(
        'Could not find bash completion script. Checked:\n' +
          possiblePaths.join('\n'),
      );
    }
  });

  /**
   * Simulates bash tab completion by sourcing the completion script
   * and invoking the completion function with the given command line.
   *
   * @param words - Array of words on the command line (e.g., ["emb", "tasks", ""])
   * @returns Array of completion suggestions
   */
  function getCompletions(words: string[]): string[] {
    // Define emb as a function that calls ./bin/run.js with EMB_ROOT set
    // This ensures task completion works even when emb isn't globally installed
    const script = `
      emb() { EMB_ROOT="${examplePath}" ./bin/run.js "$@"; }
      export -f emb
      source "${completionScriptPath}"
      COMP_WORDS=(${words.map((w) => `"${w}"`).join(' ')})
      COMP_CWORD=${words.length - 1}
      _emb_autocomplete
      printf '%s\\n' "\${COMPREPLY[@]}"
    `;

    const result = spawnSync('bash', ['-c', script], {
      encoding: 'utf8',
      cwd: process.cwd(),
    });

    if (result.error) {
      throw result.error;
    }

    return result.stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
  }

  test('completes top-level commands for "emb <TAB>"', () => {
    const completions = getCompletions(['emb', '']);

    // Should include main commands
    expect(completions).to.include('up');
    expect(completions).to.include('down');
    expect(completions).to.include('start');
    expect(completions).to.include('stop');
    expect(completions).to.include('restart');
    expect(completions).to.include('clean');
    expect(completions).to.include('ps');

    // Should include topic commands
    expect(completions).to.include('tasks');
    expect(completions).to.include('components');
    expect(completions).to.include('containers');
    expect(completions).to.include('images');
    expect(completions).to.include('resources');
    expect(completions).to.include('kubernetes');
    expect(completions).to.include('config');

    // Should include utility commands
    expect(completions).to.include('help');
    expect(completions).to.include('autocomplete');
  });

  test('completes subcommands for "emb tasks <TAB>"', () => {
    const completions = getCompletions(['emb', 'tasks', '']);

    expect(completions).to.include('run');
  });

  test('completes subcommands for "emb images <TAB>"', () => {
    const completions = getCompletions(['emb', 'images', '']);

    expect(completions).to.include('delete');
    expect(completions).to.include('prune');
    expect(completions).to.include('push');
  });

  test('completes subcommands for "emb components <TAB>"', () => {
    const completions = getCompletions(['emb', 'components', '']);

    expect(completions).to.include('logs');
    expect(completions).to.include('shell');
  });

  test('completes flags for "emb up --<TAB>"', () => {
    const completions = getCompletions(['emb', 'up', '--']);

    expect(completions).to.include('--flavor');
    expect(completions).to.include('--force');
    expect(completions).to.include('--json');
    expect(completions).to.include('--verbose');
  });

  test('completes flags for "emb tasks --<TAB>"', () => {
    const completions = getCompletions(['emb', 'tasks', '--']);

    expect(completions).to.include('--json');
    expect(completions).to.include('--verbose');
  });

  test('completes flags for "emb tasks run --<TAB>"', () => {
    const completions = getCompletions(['emb', 'tasks', 'run', '--']);

    expect(completions).to.include('--executor');
    expect(completions).to.include('--all-matching');
    expect(completions).to.include('--json');
    expect(completions).to.include('--verbose');
  });

  test('filters completions based on partial input "emb ta<TAB>"', () => {
    const completions = getCompletions(['emb', 'ta']);

    expect(completions).to.include('tasks');
    expect(completions).not.to.include('up');
    expect(completions).not.to.include('components');
  });

  test('filters flag completions based on partial input "emb up --fl<TAB>"', () => {
    const completions = getCompletions(['emb', 'up', '--fl']);

    expect(completions).to.include('--flavor');
    expect(completions).not.to.include('--force');
    expect(completions).not.to.include('--json');
  });

  // Task name completion tests using fullstack-app example

  test('completes task names for "emb tasks run <TAB>"', () => {
    const completions = getCompletions(['emb', 'tasks', 'run', '']);

    // Should include project-level tasks from fullstack-app
    expect(completions).to.include('setup');
    expect(completions).to.include('deps');
    expect(completions).to.include('build');

    // Should include component tasks
    expect(completions).to.include('api:test');
    expect(completions).to.include('api:lint');
    expect(completions).to.include('api:fail');
    expect(completions).to.include('web:test');
  });

  test('completes task names for "emb run <TAB>" (alias)', () => {
    const completions = getCompletions(['emb', 'run', '']);

    // Should include all available tasks (same as tasks:run)
    expect(completions).to.include('setup');
    expect(completions).to.include('deps');
    expect(completions).to.include('build');
    expect(completions).to.include('api:test');
  });

  test('filters task names for "emb tasks run dep<TAB>"', () => {
    const completions = getCompletions(['emb', 'tasks', 'run', 'dep']);

    // Should include tasks starting with "dep"
    expect(completions).to.include('deps');

    // Should NOT include unrelated tasks
    expect(completions).not.to.include('setup');
    expect(completions).not.to.include('build');
  });

  test('filters task names for "emb tasks run test<TAB>"', () => {
    const completions = getCompletions(['emb', 'tasks', 'run', 'test']);

    // Should include all tasks containing "test"
    expect(completions).to.include('api:test');
    expect(completions).to.include('web:test');

    // Should NOT include unrelated tasks
    expect(completions).not.to.include('setup');
    expect(completions).not.to.include('build');
  });
});
