import { setContext } from '@';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { DockerComposeClient } from '@/docker';
import { GetDeploymentPodsOperation } from '@/kubernetes/operations/GetDeploymentPodsOperation.js';
import { Monorepo } from '@/monorepo';

describe('Kubernetes / Operations / GetDeploymentPodsOperation', () => {
  let tempDir: string;
  let repo: Monorepo;
  let mockKubernetes: {
    core: {
      listNamespacedPod: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embK8sTest'));
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

    mockKubernetes = {
      core: {
        listNamespacedPod: vi.fn().mockResolvedValue({ items: [] }),
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
      const operation = new GetDeploymentPodsOperation();
      expect(operation).toBeInstanceOf(GetDeploymentPodsOperation);
    });
  });

  describe('schema validation', () => {
    test('it rejects missing namespace', async () => {
      const operation = new GetDeploymentPodsOperation();
      await expect(
        operation.run({ deployment: 'api' } as never),
      ).rejects.toThrow();
    });

    test('it rejects missing deployment', async () => {
      const operation = new GetDeploymentPodsOperation();
      await expect(
        operation.run({ namespace: 'default' } as never),
      ).rejects.toThrow();
    });

    test('it accepts valid input', async () => {
      const operation = new GetDeploymentPodsOperation();
      await expect(
        operation.run({ namespace: 'default', deployment: 'api' }),
      ).resolves.not.toThrow();
    });
  });

  describe('#run()', () => {
    test('it calls kubernetes API with correct parameters', async () => {
      const operation = new GetDeploymentPodsOperation();
      await operation.run({ namespace: 'production', deployment: 'api' });

      expect(mockKubernetes.core.listNamespacedPod).toHaveBeenCalledWith({
        namespace: 'production',
        labelSelector: 'component=api',
      });
    });

    test('it returns pods from the kubernetes API', async () => {
      const mockPods = [
        { metadata: { name: 'api-pod-1' } },
        { metadata: { name: 'api-pod-2' } },
      ];
      mockKubernetes.core.listNamespacedPod.mockResolvedValue({
        items: mockPods,
      });

      const operation = new GetDeploymentPodsOperation();
      const result = await operation.run({
        namespace: 'default',
        deployment: 'api',
      });

      expect(result).toEqual(mockPods);
    });

    test('it returns empty array when no pods found', async () => {
      mockKubernetes.core.listNamespacedPod.mockResolvedValue({ items: [] });

      const operation = new GetDeploymentPodsOperation();
      const result = await operation.run({
        namespace: 'default',
        deployment: 'nonexistent',
      });

      expect(result).toEqual([]);
    });
  });
});
