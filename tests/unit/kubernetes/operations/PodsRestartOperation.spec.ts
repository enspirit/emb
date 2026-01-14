import { setContext } from '@';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { DockerComposeClient } from '@/docker';
import { PodsRestartOperation } from '@/kubernetes/operations/RestartPodsOperation.js';
import { Monorepo } from '@/monorepo';

describe('Kubernetes / Operations / PodsRestartOperation', () => {
  let tempDir: string;
  let repo: Monorepo;
  let mockKubernetes: {
    apps: {
      listNamespacedDeployment: ReturnType<typeof vi.fn>;
      patchNamespacedDeployment: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embK8sRestartTest'));
    await mkdir(join(tempDir, '.emb'), { recursive: true });

    repo = new Monorepo(
      {
        project: { name: 'test-k8s' },
        plugins: [],
        components: {},
      },
      tempDir,
    );

    await repo.init();

    // Mock taskManager
    const mockManager = {
      add: vi.fn(),
      runAll: vi.fn().mockImplementation(() => Promise.resolve()),
    };
    vi.spyOn(repo, 'taskManager').mockReturnValue(mockManager as never);

    mockKubernetes = {
      apps: {
        listNamespacedDeployment: vi.fn().mockResolvedValue({ items: [] }),
        patchNamespacedDeployment: vi.fn().mockResolvedValue({}),
      },
    };

    const compose = new DockerComposeClient(repo);
    vi.spyOn(compose, 'isService').mockResolvedValue(false);

    setContext({
      docker: vi.mockObject({} as never),
      kubernetes: mockKubernetes as never,
      monorepo: repo,
      compose,
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
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

      const manager = repo.taskManager();
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

      const manager = repo.taskManager();
      const addCall = (manager.add as ReturnType<typeof vi.fn>).mock.calls[0];
      const tasks = addCall[0];
      expect(tasks).toHaveLength(2);
    });

    test('it runs all tasks', async () => {
      const operation = new PodsRestartOperation();
      await operation.run({ namespace: 'default', deployments: ['api'] });

      const manager = repo.taskManager();
      expect(manager.runAll).toHaveBeenCalled();
    });
  });
});
