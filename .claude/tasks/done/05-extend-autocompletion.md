# Problem to solve

I would like to find ways to extend the autocompletion of the CLI to autocomplete task names on `emb tasks run` and its equivalent shortcuts `emb run`.

Let's start with a first step: Please write a series of integration tests on the autocompletion to expect the following:

`emb tasks run <TAB>` should autocomplete to the list of all available tasks (run `emb tasks` to find them in this repo).
`emb tasks run dep<TAB>` should autocomplete to `emb tasks run dependent` since it's the only possible match
`emb tasks run test<TAB>` should autocomplete to the options 'buildargs:test' 'dependent:test' since it's ambiguous

This should give us a red tests suite, once we have that we will then proceed to the implementation.

## Current Status

### Bash completion
- [x] Write failing integration tests for task name completion
- [x] Implement task name completion in bash autocomplete script
- [x] Run tests and verify they pass (all 13 tests passing)

### Zsh completion
- [x] Write integration tests for zsh command/flag completion (equivalent to bash coverage)
- [x] Write failing integration tests for zsh task name completion
- [x] Implement task name completion in zsh autocomplete script
- [x] Run tests and verify they pass (all 25 tests passing: 13 bash + 12 zsh)

## Technical Analysis

### Challenge

oclif's `@oclif/plugin-autocomplete` does NOT support argument completion - only commands and flags. This is a known limitation (GitHub issue #1, closed as "not planned" after 6 years).

The generated bash completion script has a hardcoded list of commands with their flags:
```bash
local commands="
clean --json --verbose --force
tasks --json --verbose
tasks:run --json --verbose --executor --all-matching
..."
```

For argument positions (like task names after `tasks run`), it returns empty completions.

### Solution Approach

Extend the bash completion function to detect when we're completing arguments for `tasks:run` or `run` commands, and dynamically fetch available task names by calling `emb tasks --json`.

The completion function needs to:
1. Detect if the command is `tasks:run` or `run`
2. Check if we're in argument position (not flag position)
3. Call `emb tasks --json` to get available task IDs
4. Filter by prefix if partial input provided
5. Return matching task names

### Files Modified

- `tests/integration/cli/autocomplete/bash.spec.ts` - 13 tests for bash command/flag/task completion
- `tests/integration/cli/autocomplete/zsh.spec.ts` - 12 tests for zsh command/flag/task completion
- `src/cli/hooks/postrun.ts` - Postrun hook that patches both bash and zsh completion scripts
- `package.json` - Registered the postrun hook

### Implementation Details

The solution uses oclif's `postrun` hook to patch the generated completion scripts after `emb autocomplete` runs:

#### Bash
1. **Task completion function** (`_emb_complete_tasks`): Calls `emb tasks --json` to get available tasks, then filters by substring match
2. **Injection point**: Injected right before the `if [[ -z "$normalizedCommand" ]]` check
3. **Pattern matching**: Detects `tasks:run:*` or `run:*` commands and calls the task completion function
4. **Substring matching**: Unlike typical prefix-only completion, supports substring matching (e.g., "test" matches "buildargs:test")

#### Zsh
1. **Task completion function** (`_emb_complete_tasks`): Uses zsh's `_describe` to add task completions
2. **Injection point**: Replaces `"*: :_files"` with `"*: :_emb_complete_tasks"` in the run command sections
3. **Coverage**: Both `tasks run` and the `run` alias use task completion

## Test Cases

```
emb tasks run <TAB>        → all task IDs (dependent, greet, prereq, buildargs:test, ...)
emb run <TAB>              → all task IDs (alias for tasks:run)
emb tasks run dep<TAB>     → dependent, dependent:test
emb tasks run test<TAB>    → buildargs:test, dependent:test, frontend:test
```