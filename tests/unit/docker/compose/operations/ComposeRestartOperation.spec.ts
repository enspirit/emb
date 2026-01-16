import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ComposeRestartOperation } from '@/docker';

describe('Docker / Compose / Operations / ComposeRestartOperation', () => {
  let setup: TestSetup;

  beforeEach(async () => {
    setup = await createTestSetup({ tempDirPrefix: 'embComposeRestartTest' });

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
      const operation = new ComposeRestartOperation();
      expect(operation).toBeInstanceOf(ComposeRestartOperation);
    });
  });

  describe('#run()', () => {
    test('it adds a task to restart containers', async () => {
      const operation = new ComposeRestartOperation();
      await operation.run({});

      const manager = setup.monorepo.taskManager();
      expect(manager.add).toHaveBeenCalledTimes(1);
      expect(manager.runAll).toHaveBeenCalledTimes(1);
    });

    test('it uses "Restarting project" title when no services specified', async () => {
      const operation = new ComposeRestartOperation();
      await operation.run({});

      const manager = setup.monorepo.taskManager();
      const addCall = (manager.add as ReturnType<typeof vi.fn>).mock.calls[0];
      const tasks = addCall[0];
      expect(tasks[0].title).toBe('Restarting project');
    });

    test('it includes service names in title when services specified', async () => {
      const operation = new ComposeRestartOperation();
      await operation.run({ services: ['api', 'web'] });

      const manager = setup.monorepo.taskManager();
      const addCall = (manager.add as ReturnType<typeof vi.fn>).mock.calls[0];
      const tasks = addCall[0];
      expect(tasks[0].title).toBe('Restarting api, web');
    });
  });

  describe('schema validation', () => {
    test('it accepts undefined input', async () => {
      const operation = new ComposeRestartOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts empty object', async () => {
      const operation = new ComposeRestartOperation();
      await expect(operation.run({})).resolves.not.toThrow();
    });

    test('it accepts services array', async () => {
      const operation = new ComposeRestartOperation();
      await expect(operation.run({ services: ['api'] })).resolves.not.toThrow();
    });

    test('it accepts noDeps boolean', async () => {
      const operation = new ComposeRestartOperation();
      await expect(operation.run({ noDeps: true })).resolves.not.toThrow();
    });

    test('it accepts both services and noDeps', async () => {
      const operation = new ComposeRestartOperation();
      await expect(
        operation.run({ services: ['api'], noDeps: true }),
      ).resolves.not.toThrow();
    });
  });
});
