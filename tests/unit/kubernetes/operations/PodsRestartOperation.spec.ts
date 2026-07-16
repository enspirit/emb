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

  describe('#patchDeployment()', () => {
    // Called directly: the taskManager mock above resolves runAll without ever
    // executing the per-deployment tasks, so the public path never patches.
    test('it uses a strategic merge patch so it works when annotations are absent', async () => {
      const operation = new PodsRestartOperation();

      await (
        operation as unknown as {
          patchDeployment: (
            namespace: string,
            name: string,
          ) => Promise<unknown>;
        }
      ).patchDeployment('production', 'api');

      expect(
        mockKubernetes.apps.patchNamespacedDeployment,
      ).toHaveBeenCalledTimes(1);

      const [params, options] =
        mockKubernetes.apps.patchNamespacedDeployment.mock.calls[0];

      // A strategic-merge object, NOT an RFC6902 `add` array (which the API
      // server rejects when spec.template.metadata.annotations does not exist).
      expect(Array.isArray(params.body)).toBe(false);
      expect(params.body).toMatchObject({
        spec: {
          template: {
            metadata: {
              annotations: {
                'kubectl.kubernetes.io/restartedAt': expect.any(String),
              },
            },
          },
        },
      });

      // A content-type override must be passed so the request is sent as a
      // strategic merge patch (client-node defaults to json-patch).
      expect(options).toBeDefined();
    });
  });
});
