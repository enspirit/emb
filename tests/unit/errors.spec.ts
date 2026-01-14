import {
  AmbiguousReferenceError,
  CircularDependencyError,
  CliError,
  CommandExecError,
  ComposeExecError,
  EMBError,
  ItemCollisionsError,
  MultipleContainersFoundError,
  NoContainerFoundError,
  ShellExitError,
  UnkownReferenceError,
} from '@';
import { describe, expect, test } from 'vitest';

describe('Errors', () => {
  describe('EMBError', () => {
    test('it stores code and message', () => {
      const error = new EMBError('TEST_CODE', 'Test message');

      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toBe('Test message');
      expect(error).toBeInstanceOf(Error);
    });

    test('it can be converted to CliError', () => {
      const error = new EMBError('TEST_CODE', 'Test message');

      const cliError = error.toCliError(
        ['Try this', 'Or that'],
        'https://docs.example.com',
      );

      expect(cliError).toBeInstanceOf(CliError);
      expect(cliError.code).toBe('TEST_CODE');
      expect(cliError.message).toBe('Test message');
      expect(cliError.suggestions).toEqual(['Try this', 'Or that']);
      expect(cliError.ref).toBe('https://docs.example.com');
    });
  });

  describe('CliError', () => {
    test('it stores code, message, suggestions, and ref', () => {
      const error = new CliError(
        'CLI_ERR',
        'Something went wrong',
        ['Check your config', 'Run with --verbose'],
        'https://docs.example.com/errors',
      );

      expect(error.code).toBe('CLI_ERR');
      expect(error.message).toBe('Something went wrong');
      expect(error.suggestions).toEqual([
        'Check your config',
        'Run with --verbose',
      ]);
      expect(error.ref).toBe('https://docs.example.com/errors');
      expect(error).toBeInstanceOf(EMBError);
    });

    test('it works without optional parameters', () => {
      const error = new CliError('CLI_ERR', 'Minimal error');

      expect(error.code).toBe('CLI_ERR');
      expect(error.message).toBe('Minimal error');
      expect(error.suggestions).toBeUndefined();
      expect(error.ref).toBeUndefined();
    });
  });

  describe('AmbiguousReferenceError', () => {
    test('it stores ref and matches', () => {
      const error = new AmbiguousReferenceError(
        'Reference "build" is ambiguous',
        'build',
        ['api:build', 'frontend:build', 'backend:build'],
      );

      expect(error.code).toBe('AMBIGUOUS_REF');
      expect(error.ref).toBe('build');
      expect(error.matches).toEqual([
        'api:build',
        'frontend:build',
        'backend:build',
      ]);
      expect(error).toBeInstanceOf(EMBError);
    });
  });

  describe('UnkownReferenceError', () => {
    test('it stores ref', () => {
      const error = new UnkownReferenceError(
        'Unknown reference "nonexistent"',
        'nonexistent',
      );

      expect(error.code).toBe('UNKNOWN_REF');
      expect(error.ref).toBe('nonexistent');
      expect(error).toBeInstanceOf(EMBError);
    });
  });

  describe('ItemCollisionsError', () => {
    test('it stores collisions array', () => {
      const error = new ItemCollisionsError('Item collisions detected', [
        'id "foo" used by bar and baz',
        'id "qux" used by a and b',
      ]);

      expect(error.code).toBe('ITEM_COLLISIONS');
      expect(error.collisions).toEqual([
        'id "foo" used by bar and baz',
        'id "qux" used by a and b',
      ]);
      expect(error).toBeInstanceOf(EMBError);
    });
  });

  describe('CircularDependencyError', () => {
    test('it stores dependency cycles', () => {
      const error = new CircularDependencyError(
        'Circular dependencies detected',
        [
          ['a', 'b', 'c', 'a'],
          ['x', 'y', 'x'],
        ],
      );

      expect(error.code).toBe('CIRCULAR_DEPS');
      expect(error.deps).toEqual([
        ['a', 'b', 'c', 'a'],
        ['x', 'y', 'x'],
      ]);
      expect(error).toBeInstanceOf(EMBError);
    });
  });

  describe('ShellExitError', () => {
    test('it stores service, exit code, and signal', () => {
      const error = new ShellExitError(
        'Shell command failed',
        'api',
        1,
        'SIGTERM',
      );

      expect(error.code).toBe('SHELL_EXIT_ERR');
      expect(error.service).toBe('api');
      expect(error.exitCode).toBe(1);
      expect(error.signal).toBe('SIGTERM');
      expect(error).toBeInstanceOf(EMBError);
    });

    test('it works without signal', () => {
      const error = new ShellExitError('Shell command failed', 'api', 127);

      expect(error.exitCode).toBe(127);
      expect(error.signal).toBeUndefined();
    });
  });

  describe('NoContainerFoundError', () => {
    test('it stores component name', () => {
      const error = new NoContainerFoundError(
        'No container found for component',
        'api',
      );

      expect(error.code).toBe('CMP_NO_CONTAINER');
      expect(error.component).toBe('api');
      expect(error).toBeInstanceOf(EMBError);
    });
  });

  describe('MultipleContainersFoundError', () => {
    test('it stores component name', () => {
      const error = new MultipleContainersFoundError(
        'Multiple containers found for component',
        'api',
      );

      expect(error.code).toBe('CMP_NO_CONTAINER');
      expect(error.component).toBe('api');
      expect(error).toBeInstanceOf(EMBError);
    });
  });

  describe('CommandExecError', () => {
    test('it stores exit code and signal', () => {
      const error = new CommandExecError(
        'Command execution failed',
        1,
        'SIGKILL',
      );

      expect(error.code).toBe('COMMAND_EXEC_ERR');
      expect(error.exitCode).toBe(1);
      expect(error.signal).toBe('SIGKILL');
      expect(error).toBeInstanceOf(EMBError);
    });
  });

  describe('ComposeExecError', () => {
    test('it stores exit code and signal', () => {
      const error = new ComposeExecError(
        'Docker compose command failed',
        2,
        'SIGINT',
      );

      expect(error.code).toBe('COMPOSE_EXEC_ERR');
      expect(error.exitCode).toBe(2);
      expect(error.signal).toBe('SIGINT');
      expect(error).toBeInstanceOf(EMBError);
    });
  });
});
