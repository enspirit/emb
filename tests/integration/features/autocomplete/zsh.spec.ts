import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, test } from 'vitest';

const currentDir = dirname(fileURLToPath(import.meta.url));
const examplePath = resolve(currentDir, '../../../../examples/fullstack-app');

/**
 * Integration tests for zsh tab completion.
 *
 * Zsh completion testing is more complex than bash because zsh's completion
 * system uses special functions (_arguments, _values, compadd) that only work
 * in a proper completion context.
 *
 * These tests verify:
 * 1. The completion script is generated correctly
 * 2. Expected commands and subcommands are defined
 * 3. Flags are properly configured
 * 4. Task name completion is available (once implemented)
 */
// Skip: These tests depend on cached completion scripts which are fragile in CI
// Run manually with: npx vitest run tests/integration/features/autocomplete/zsh.spec.ts
describe.skip('CLI - zsh autocomplete', () => {
  let completionScriptPath: string;
  let completionScript: string;

  beforeAll(() => {
    // Generate the autocomplete cache
    execSync('./bin/run.js autocomplete zsh', {
      cwd: process.cwd(),
      stdio: 'pipe',
      env: { ...process.env, EMB_ROOT: examplePath },
    });

    // Find the completion script path (macOS vs Linux cache location)
    const possiblePaths = [
      join(homedir(), 'Library/Caches/emb/autocomplete/functions/zsh/_emb'), // macOS
      join(homedir(), '.cache/emb/autocomplete/functions/zsh/_emb'), // Linux
    ];

    completionScriptPath = possiblePaths.find((p) => existsSync(p)) || '';

    if (!completionScriptPath) {
      throw new Error(
        'Could not find zsh completion script. Checked:\n' +
          possiblePaths.join('\n'),
      );
    }

    completionScript = readFileSync(completionScriptPath, 'utf8');
  });

  /**
   * Extract commands from the zsh completion script.
   * Commands are defined in _values calls like: "command[description]"
   */
  function extractCommands(): string[] {
    const matches = completionScript.match(/"([a-z_-]+)\[/g) || [];
    return [...new Set(matches.map((m) => m.slice(1, -1)))];
  }

  /**
   * Check if a specific command definition exists in the script.
   */
  function hasCommandDefinition(command: string): boolean {
    return completionScript.includes(`"${command}[`);
  }

  // ==================== Command Completion Tests ====================

  test('script defines top-level commands', () => {
    const commands = extractCommands();

    // Main commands
    expect(commands).to.include('up');
    expect(commands).to.include('down');
    expect(commands).to.include('start');
    expect(commands).to.include('stop');
    expect(commands).to.include('restart');
    expect(commands).to.include('clean');
    expect(commands).to.include('ps');

    // Topic commands
    expect(commands).to.include('tasks');
    expect(commands).to.include('components');
    expect(commands).to.include('containers');
    expect(commands).to.include('images');
    expect(commands).to.include('resources');
    expect(commands).to.include('kubernetes');
    expect(commands).to.include('config');

    // Utility commands
    expect(commands).to.include('help');
    expect(commands).to.include('autocomplete');
  });

  test('script defines tasks subcommands', () => {
    expect(hasCommandDefinition('run')).to.equal(true);
  });

  test('script defines images subcommands', () => {
    expect(hasCommandDefinition('delete')).to.equal(true);
    expect(hasCommandDefinition('prune')).to.equal(true);
    expect(hasCommandDefinition('push')).to.equal(true);
  });

  test('script defines components subcommands', () => {
    expect(hasCommandDefinition('logs')).to.equal(true);
    expect(hasCommandDefinition('shell')).to.equal(true);
  });

  // ==================== Flag Completion Tests ====================

  test('script defines flags for up command', () => {
    // Find the up command section
    const upSection = completionScript.match(
      /^up\)\n_arguments[\s\S]*?;;\s*$/m,
    );
    expect(upSection).not.to.equal(null);
    expect(upSection![0]).to.include('--flavor');
    expect(upSection![0]).to.include('--force');
    expect(upSection![0]).to.include('--json');
    expect(upSection![0]).to.include('--verbose');
  });

  test('script defines flags for tasks command', () => {
    // The tasks flags are in _emb_tasks_flags
    expect(completionScript).to.include('_emb_tasks_flags');
    const tasksFlagsSection = completionScript.match(
      /_emb_tasks_flags\(\) \{[\s\S]*?\}/,
    );
    expect(tasksFlagsSection).not.to.equal(null);
    expect(tasksFlagsSection![0]).to.include('--json');
    expect(tasksFlagsSection![0]).to.include('--verbose');
  });

  test('script defines flags for tasks run command', () => {
    // Find the tasks run section within _emb_tasks
    const tasksRunSection = completionScript.match(
      /"run"\)\s*\n\s*_arguments[\s\S]*?;;/,
    );
    expect(tasksRunSection).not.to.equal(null);
    expect(tasksRunSection![0]).to.include('--executor');
    expect(tasksRunSection![0]).to.include('--all-matching');
    expect(tasksRunSection![0]).to.include('--json');
    expect(tasksRunSection![0]).to.include('--verbose');
  });

  // ==================== Structural Tests ====================

  test('script has proper zsh completion header', () => {
    expect(completionScript).to.match(/^#compdef emb/);
  });

  test('script defines main _emb function', () => {
    expect(completionScript).to.include('_emb() {');
  });

  test('script calls _emb at the end', () => {
    expect(completionScript.trim()).to.match(/_emb$/);
  });

  // ==================== Task Name Completion Tests ====================
  // These tests verify task name completion for 'emb tasks run' and 'emb run'

  test('completes task names for "emb tasks run <TAB>"', () => {
    // Check if the completion script has task completion logic
    const hasTaskCompletion =
      completionScript.includes('_emb_complete_tasks') ||
      completionScript.includes('emb tasks --json');

    expect(hasTaskCompletion).to.equal(true);
  });

  test('completes task names for "emb run <TAB>" (alias)', () => {
    // The run command should also have task completion
    const runSection = completionScript.match(
      /^run\)\n_arguments[\s\S]*?;;\s*/m,
    );
    expect(runSection).not.to.equal(null);

    // Check if it has task completion instead of just _files
    const hasTaskCompletion =
      runSection![0].includes('_emb_complete_tasks') ||
      runSection![0].includes('emb tasks --json') ||
      !runSection![0].includes('"*: :_files"');

    expect(hasTaskCompletion).to.equal(true);
  });
});
