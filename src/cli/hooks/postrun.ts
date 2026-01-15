import { Hook } from '@oclif/core';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Task completion function to inject into the bash completion script.
 * This function is called when completing arguments for `tasks run` or `run`.
 */
const TASK_COMPLETION_FUNCTION = `
# EMB: Task name completion for 'tasks run' and 'run' commands
_emb_complete_tasks() {
  local cur="\${1:-}"
  local tasks

  # Get task IDs from emb tasks --json, extract the id field
  tasks=$(emb tasks --json 2>/dev/null | grep -o '"id": *"[^"]*"' | sed 's/"id": *"//g' | sed 's/"//g')

  if [[ -z "$tasks" ]]; then
    return
  fi

  # Filter by substring match if provided (more flexible than prefix-only)
  if [[ -n "$cur" ]]; then
    local matches=""
    for task in $tasks; do
      if [[ "$task" == *"$cur"* ]]; then
        matches="$matches $task"
      fi
    done
    COMPREPLY=($matches)
  else
    COMPREPLY=($tasks)
  fi
}
`;

/**
 * Enhanced completion logic to inject after normalizedCommand is calculated.
 * Checks if we're completing task arguments for 'tasks run' or 'run'.
 */
const TASK_COMPLETION_LOGIC = `
    # EMB: Check if we're completing task names for 'tasks run' or 'run'
    if [[ "$normalizedCommand" == tasks:run:* ]] || [[ "$normalizedCommand" == run:* ]] || [[ "$normalizedCommand" == "tasks:run" ]] || [[ "$normalizedCommand" == "run" ]]; then
      _emb_complete_tasks "$cur"
      return
    fi
`;

/**
 * Zsh task completion function to inject.
 * Uses zsh's compadd to add task completions.
 * Note: We use compadd instead of _describe because task IDs contain colons
 * (e.g., "frontend:test") and _describe uses colons as value:description delimiter.
 */
const ZSH_TASK_COMPLETION_FUNCTION = `
# EMB: Task name completion for 'tasks run' and 'run' commands
_emb_complete_tasks() {
  local tasks
  # Get task IDs from emb tasks --json, extract the id field
  tasks=(\${(f)"$(emb tasks --json 2>/dev/null | grep -o '"id": *"[^"]*"' | sed 's/"id": *"//g' | sed 's/"//g')"})

  if [[ \${#tasks[@]} -gt 0 ]]; then
    # Use compadd instead of _describe because task IDs contain colons
    # which _describe interprets as value:description separators
    compadd -a tasks
  fi
}
`;

/**
 * Patches the bash completion script.
 */
function patchBashCompletion(): void {
  const possiblePaths = [
    join(homedir(), 'Library/Caches/emb/autocomplete/functions/bash/emb.bash'),
    join(homedir(), '.cache/emb/autocomplete/functions/bash/emb.bash'),
  ];

  const scriptPath = possiblePaths.find((p) => existsSync(p));
  if (!scriptPath) {
    return;
  }

  const content = readFileSync(scriptPath, 'utf8');

  // Check if already patched
  if (content.includes('_emb_complete_tasks')) {
    return;
  }

  // Insert task completion function after the join_by function
  let patched = content.replace(
    /function join_by \{[^}]+\}/,
    (match) => `${match}\n${TASK_COMPLETION_FUNCTION}`,
  );

  // Insert task completion logic right before the "if [[ -z "$normalizedCommand" ]]" check
  patched = patched.replace(
    'if [[ -z "$normalizedCommand" ]]; then',
    `${TASK_COMPLETION_LOGIC.trim()}\n\n    if [[ -z "$normalizedCommand" ]]; then`,
  );

  writeFileSync(scriptPath, patched, 'utf8');
}

/**
 * Patches the zsh completion script.
 */
function patchZshCompletion(): void {
  const possiblePaths = [
    join(homedir(), 'Library/Caches/emb/autocomplete/functions/zsh/_emb'),
    join(homedir(), '.cache/emb/autocomplete/functions/zsh/_emb'),
  ];

  const scriptPath = possiblePaths.find((p) => existsSync(p));
  if (!scriptPath) {
    return;
  }

  const content = readFileSync(scriptPath, 'utf8');

  // Check if already patched
  if (content.includes('_emb_complete_tasks')) {
    return;
  }

  // Insert task completion function after #compdef line
  let patched = content.replace(
    '#compdef emb',
    `#compdef emb\n${ZSH_TASK_COMPLETION_FUNCTION}`,
  );

  // Replace _files with _emb_complete_tasks in run command sections
  // Pattern 1: Inside _emb_tasks for "tasks run"
  patched = patched.replace(
    /("run"\)\s*\n\s*_arguments -S[\s\S]*?)"?\*: :_files"(\s*;;)/,
    '$1"*: :_emb_complete_tasks"$2',
  );

  // Pattern 2: Top-level run) command (the alias)
  patched = patched.replace(
    /(^run\)\n_arguments -S[\s\S]*?)"?\*: :_files"(\s*;;)/m,
    '$1"*: :_emb_complete_tasks"$2',
  );

  writeFileSync(scriptPath, patched, 'utf8');
}

/**
 * Postrun hook that patches completion scripts after autocomplete generation.
 * This adds task name completion for the 'tasks run' and 'run' commands.
 */
const hook: Hook.Postrun = async function (options) {
  const commandId = options.Command?.id;

  // Only patch after autocomplete commands
  if (commandId !== 'autocomplete' && commandId !== 'autocomplete:create') {
    return;
  }

  patchBashCompletion();
  patchZshCompletion();
};

export default hook;
