import { PassThrough, Readable } from 'node:stream';
import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ComposeStopOperation } from '@/docker';

describe('Docker / Compose / Operations / ComposeStopOperation', () => {
  let setup: TestSetup;
  let mockOutput: PassThrough;

  beforeEach(async () => {
    setup = await createTestSetup({ tempDirPrefix: 'embComposeStopTest' });
    mockOutput = new PassThrough();

    // Mock the run method to return a Readable stream
    vi.spyOn(setup.monorepo, 'run').mockResolvedValue(new Readable() as never);
  });

  afterEach(async () => {
    await setup.cleanup();
  });

  describe('instantiation', () => {
    test('it creates an operation instance with output stream', () => {
      const operation = new ComposeStopOperation(mockOutput);
      expect(operation).toBeInstanceOf(ComposeStopOperation);
    });
  });

  describe('#run()', () => {
    test('it calls monorepo.run with ExecuteLocalCommandOperation', async () => {
      const operation = new ComposeStopOperation(mockOutput);
      await operation.run({});

      expect(setup.monorepo.run).toHaveBeenCalledTimes(1);
    });

    test('it returns a Readable stream', async () => {
      const operation = new ComposeStopOperation(mockOutput);
      const result = await operation.run({});

      expect(result).toBeInstanceOf(Readable);
    });

    test('it accepts empty object as input', async () => {
      const operation = new ComposeStopOperation(mockOutput);
      await expect(operation.run({})).resolves.not.toThrow();
    });
  });

  describe('schema validation', () => {
    test('it accepts undefined input', async () => {
      const operation = new ComposeStopOperation(mockOutput);
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts empty object', async () => {
      const operation = new ComposeStopOperation(mockOutput);
      await expect(operation.run({})).resolves.not.toThrow();
    });
  });
});
