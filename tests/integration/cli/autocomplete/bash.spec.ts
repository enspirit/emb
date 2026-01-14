import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';

/**
 * Integration tests for bash tab completion.
 *
 * These tests verify that the CLI's bash completion works correctly by:
 * 1. Generating the completion scripts via `emb autocomplete bash`
 * 2. Sourcing the generated bash completion function
 * 3. Simulating tab completion by setting COMP_WORDS/COMP_CWORD
 * 4. Verifying COMPREPLY contains expected completions
 */
describe('CLI - bash autocomplete', () => {
  let completionScriptPath: string;

  beforeAll(() => {
    // Generate the autocomplete cache
    execSync('./bin/run.js autocomplete bash', {
      cwd: process.cwd(),
      stdio: 'pipe',
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
    const script = `
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
});
