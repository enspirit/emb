import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ComposePsOperation } from '@/docker';

describe('Docker / Compose / Operations / ComposePsOperation', () => {
  let setup: TestSetup;

  beforeEach(async () => {
    setup = await createTestSetup({ tempDirPrefix: 'embComposePsTest' });

    // Mock setTaskRenderer
    vi.spyOn(setup.monorepo, 'setTaskRenderer');

    // Mock the run method
    vi.spyOn(setup.monorepo, 'run').mockImplementation(() => Promise.resolve());

    // Mock taskManager
    const mockManager = {
      add: vi.fn(),
      runAll: vi.fn().mockImplementation(() => Promise.resolve()),
    };
    vi.spyOn(setup.monorepo, 'taskManager').mockReturnValue(
      mockManager as never,
    );
  });

  afterEach(async () => {
    await setup.cleanup();
  });

  describe('instantiation', () => {
    test('it creates an operation instance', () => {
      const operation = new ComposePsOperation();
      expect(operation).toBeInstanceOf(ComposePsOperation);
    });
  });

  describe('#run()', () => {
    test('it sets task renderer to silent', async () => {
      const operation = new ComposePsOperation();
      await operation.run({});

      expect(setup.monorepo.setTaskRenderer).toHaveBeenCalledWith('silent');
    });

    test('it adds a task to list containers', async () => {
      const operation = new ComposePsOperation();
      await operation.run({});

      const manager = setup.monorepo.taskManager();
      expect(manager.add).toHaveBeenCalledTimes(1);
      expect(manager.runAll).toHaveBeenCalledTimes(1);
    });

    test('it adds task with "Listing running containers" title', async () => {
      const operation = new ComposePsOperation();
      await operation.run({});

      const manager = setup.monorepo.taskManager();
      const addCall = (manager.add as ReturnType<typeof vi.fn>).mock.calls[0];
      const tasks = addCall[0];
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Listing running containers');
    });
  });

  describe('schema validation', () => {
    test('it accepts undefined input', async () => {
      const operation = new ComposePsOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts empty object', async () => {
      const operation = new ComposePsOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts all flag as boolean', async () => {
      const operation = new ComposePsOperation();
      await expect(operation.run({ all: true })).resolves.not.toThrow();
    });

    test('it accepts all flag as false', async () => {
      const operation = new ComposePsOperation();
      await expect(operation.run({ all: false })).resolves.not.toThrow();
    });
  });
});
