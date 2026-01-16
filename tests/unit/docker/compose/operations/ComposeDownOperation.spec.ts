import { PassThrough, Readable } from 'node:stream';
import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ComposeDownOperation } from '@/docker';

describe('Docker / Compose / Operations / ComposeDownOperation', () => {
  let setup: TestSetup;
  let mockOutput: PassThrough;

  beforeEach(async () => {
    setup = await createTestSetup({ tempDirPrefix: 'embComposeDownTest' });
    mockOutput = new PassThrough();

    // Mock the run method to capture what command is being executed
    vi.spyOn(setup.monorepo, 'run').mockResolvedValue(new Readable() as never);
  });

  afterEach(async () => {
    await setup.cleanup();
  });

  describe('instantiation', () => {
    test('it creates an operation instance with output stream', () => {
      const operation = new ComposeDownOperation(mockOutput);
      expect(operation).toBeInstanceOf(ComposeDownOperation);
    });
  });

  describe('#run()', () => {
    test('it calls monosetup.monorepo.run with ExecuteLocalCommandOperation', async () => {
      const operation = new ComposeDownOperation(mockOutput);
      await operation.run({});

      expect(setup.monorepo.run).toHaveBeenCalledTimes(1);
    });

    test('it returns a Readable stream', async () => {
      const operation = new ComposeDownOperation(mockOutput);
      const result = await operation.run({});

      expect(result).toBeInstanceOf(Readable);
    });

    test('it accepts empty object as input', async () => {
      const operation = new ComposeDownOperation(mockOutput);
      await expect(operation.run({})).resolves.not.toThrow();
    });
  });

  describe('schema validation', () => {
    test('it accepts undefined input', async () => {
      const operation = new ComposeDownOperation(mockOutput);
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts empty object', async () => {
      const operation = new ComposeDownOperation(mockOutput);
      await expect(operation.run({})).resolves.not.toThrow();
    });
  });
});
