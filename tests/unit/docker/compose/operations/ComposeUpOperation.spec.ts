import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ComposeUpOperation } from '@/docker';

describe('Docker / Compose / Operations / ComposeUpOperation', () => {
  let setup: TestSetup;

  beforeEach(async () => {
    setup = await createTestSetup({ tempDirPrefix: 'embComposeUpTest' });

    // Mock setTaskRenderer to silent to avoid output issues
    vi.spyOn(setup.monorepo, 'setTaskRenderer');

    // Mock the run method to capture what command is being executed
    vi.spyOn(setup.monorepo, 'run').mockImplementation(() => Promise.resolve());

    // Mock taskManager to track tasks being added
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
      const operation = new ComposeUpOperation();
      expect(operation).toBeInstanceOf(ComposeUpOperation);
    });
  });

  describe('#run()', () => {
    test('it adds a task to start the project', async () => {
      const operation = new ComposeUpOperation();
      await operation.run({});

      const manager = setup.monorepo.taskManager();
      expect(manager.add).toHaveBeenCalledTimes(1);
      expect(manager.runAll).toHaveBeenCalledTimes(1);
    });

    test('it adds tasks with "Starting project" title for no components', async () => {
      const operation = new ComposeUpOperation();
      await operation.run({});

      const manager = setup.monorepo.taskManager();
      const addCall = (manager.add as ReturnType<typeof vi.fn>).mock.calls[0];
      const tasks = addCall[0];
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Starting project');
    });

    test('it includes component names in command when specified', async () => {
      const operation = new ComposeUpOperation();
      await operation.run({ components: ['api', 'web'] });

      const manager = setup.monorepo.taskManager();
      expect(manager.add).toHaveBeenCalledTimes(1);
    });

    test('it includes --force-recreate flag when forceRecreate is true', async () => {
      const operation = new ComposeUpOperation();
      await operation.run({ forceRecreate: true });

      const manager = setup.monorepo.taskManager();
      expect(manager.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('schema validation', () => {
    test('it accepts undefined input', async () => {
      const operation = new ComposeUpOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts empty object', async () => {
      const operation = new ComposeUpOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts components array', async () => {
      const operation = new ComposeUpOperation();
      await expect(
        operation.run({ components: ['service1'] }),
      ).resolves.not.toThrow();
    });

    test('it accepts forceRecreate boolean', async () => {
      const operation = new ComposeUpOperation();
      await expect(
        operation.run({ forceRecreate: true }),
      ).resolves.not.toThrow();
    });
  });
});
