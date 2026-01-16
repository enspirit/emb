import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ComposeStartOperation } from '@/docker';

describe('Docker / Compose / Operations / ComposeStartOperation', () => {
  let setup: TestSetup;

  beforeEach(async () => {
    setup = await createTestSetup({ tempDirPrefix: 'embComposeStartTest' });

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
      const operation = new ComposeStartOperation();
      expect(operation).toBeInstanceOf(ComposeStartOperation);
    });
  });

  describe('#run()', () => {
    test('it adds a task to start containers', async () => {
      const operation = new ComposeStartOperation();
      await operation.run({});

      const manager = setup.monorepo.taskManager();
      expect(manager.add).toHaveBeenCalledTimes(1);
      expect(manager.runAll).toHaveBeenCalledTimes(1);
    });

    test('it uses "Starting project" title when no services specified', async () => {
      const operation = new ComposeStartOperation();
      await operation.run({});

      const manager = setup.monorepo.taskManager();
      const addCall = (manager.add as ReturnType<typeof vi.fn>).mock.calls[0];
      const tasks = addCall[0];
      expect(tasks[0].title).toBe('Starting project');
    });

    test('it includes service names in title when services specified', async () => {
      const operation = new ComposeStartOperation();
      await operation.run({ services: ['api', 'web'] });

      const manager = setup.monorepo.taskManager();
      const addCall = (manager.add as ReturnType<typeof vi.fn>).mock.calls[0];
      const tasks = addCall[0];
      expect(tasks[0].title).toBe('Starting api, web');
    });
  });

  describe('schema validation', () => {
    test('it accepts undefined input', async () => {
      const operation = new ComposeStartOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts empty object', async () => {
      const operation = new ComposeStartOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts services array', async () => {
      const operation = new ComposeStartOperation();
      await expect(operation.run({ services: ['api'] })).resolves.not.toThrow();
    });

    test('it accepts multiple services', async () => {
      const operation = new ComposeStartOperation();
      await expect(
        operation.run({ services: ['api', 'web', 'db'] }),
      ).resolves.not.toThrow();
    });
  });
});
