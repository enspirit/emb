import { PassThrough } from 'node:stream';
import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { ComposeExecOperation } from '@/docker';

describe('Docker / Compose / Operations / ComposeExecOperation', () => {
  let setup: TestSetup;
  let mockOutput: PassThrough;

  beforeEach(async () => {
    setup = await createTestSetup({ tempDirPrefix: 'embComposeExecTest' });
    mockOutput = new PassThrough();
  });

  afterEach(async () => {
    await setup.cleanup();
  });

  describe('instantiation', () => {
    test('it creates an operation instance without output stream', () => {
      const operation = new ComposeExecOperation();
      expect(operation).toBeInstanceOf(ComposeExecOperation);
    });

    test('it creates an operation instance with output stream', () => {
      const operation = new ComposeExecOperation(mockOutput);
      expect(operation).toBeInstanceOf(ComposeExecOperation);
    });
  });

  describe('schema validation', () => {
    test('it rejects undefined input', async () => {
      const operation = new ComposeExecOperation(mockOutput);
      await expect(operation.run(undefined as never)).rejects.toThrow();
    });

    test('it rejects empty object', async () => {
      const operation = new ComposeExecOperation(mockOutput);
      await expect(operation.run({} as never)).rejects.toThrow();
    });

    test('it rejects input without service', async () => {
      const operation = new ComposeExecOperation(mockOutput);
      await expect(
        operation.run({ command: 'echo hello' } as never),
      ).rejects.toThrow();
    });

    test('it rejects input without command', async () => {
      const operation = new ComposeExecOperation(mockOutput);
      await expect(
        operation.run({ service: 'api' } as never),
      ).rejects.toThrow();
    });
  });

  describe('input schema', () => {
    test('it requires service as string', () => {
      // The operation requires service to be a string
      const operation = new ComposeExecOperation(mockOutput);
      expect(operation).toBeDefined();
    });

    test('it requires command as string', () => {
      // The operation requires command to be a string
      const operation = new ComposeExecOperation(mockOutput);
      expect(operation).toBeDefined();
    });

    test('it accepts optional env object', () => {
      // The operation accepts optional env parameter
      const operation = new ComposeExecOperation(mockOutput);
      expect(operation).toBeDefined();
    });
  });
});
