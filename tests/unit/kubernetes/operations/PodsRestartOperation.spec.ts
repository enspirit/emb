import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PodsRestartOperation } from '@/kubernetes/operations/RestartPodsOperation.js';

describe('Kubernetes / Operations / PodsRestartOperation', () => {
  let setup: TestSetup;
  let mockKubernetes: {
    apps: {
      listNamespacedDeployment: ReturnType<typeof vi.fn>;
      patchNamespacedDeployment: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    mockKubernetes = {
      apps: {
        listNamespacedDeployment: vi.fn().mockResolvedValue({ items: [] }),
        patchNamespacedDeployment: vi.fn().mockResolvedValue({}),
      },
    };

    setup = await createTestSetup({
      tempDirPrefix: 'embK8sRestartTest',
      embfile: { project: { name: 'test-k8s' }, plugins: [], components: {} },
      context: { kubernetes: mockKubernetes as never },
    });

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
      const operation = new PodsRestartOperation();
      expect(operation).toBeInstanceOf(PodsRestartOperation);
    });
  });

  describe('schema validation', () => {
    test('it rejects missing namespace', async () => {
      const operation = new PodsRestartOperation();
      await expect(operation.run({} as never)).rejects.toThrow();
    });

    test('it accepts namespace only', async () => {
      const operation = new PodsRestartOperation();
      await expect(
        operation.run({ namespace: 'default' }),
      ).resolves.not.toThrow();
    });

    test('it accepts namespace with deployments', async () => {
      const operation = new PodsRestartOperation();
      await expect(
        operation.run({ namespace: 'default', deployments: ['api', 'web'] }),
      ).resolves.not.toThrow();
    });
  });

  describe('#run()', () => {
    test('it adds tasks for each deployment', async () => {
      const operation = new PodsRestartOperation();
      await operation.run({
        namespace: 'production',
        deployments: ['api', 'web'],
      });

      const manager = setup.monorepo.taskManager();
      expect(manager.add).toHaveBeenCalledTimes(1);
      const addCall = (manager.add as ReturnType<typeof vi.fn>).mock.calls[0];
      const tasks = addCall[0];
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Restart api');
      expect(tasks[1].title).toBe('Restart web');
    });

    test('it lists deployments when none specified', async () => {
      mockKubernetes.apps.listNamespacedDeployment.mockResolvedValue({
        items: [
          { metadata: { name: 'api' } },
          { metadata: { name: 'worker' } },
        ],
      });

      const operation = new PodsRestartOperation();
      await operation.run({ namespace: 'default' });

      expect(mockKubernetes.apps.listNamespacedDeployment).toHaveBeenCalledWith(
        { namespace: 'default' },
      );

      const manager = setup.monorepo.taskManager();
      const addCall = (manager.add as ReturnType<typeof vi.fn>).mock.calls[0];
      const tasks = addCall[0];
      expect(tasks).toHaveLength(2);
    });

    test('it runs all tasks', async () => {
      const operation = new PodsRestartOperation();
      await operation.run({ namespace: 'default', deployments: ['api'] });

      const manager = setup.monorepo.taskManager();
      expect(manager.runAll).toHaveBeenCalled();
    });
  });
});
