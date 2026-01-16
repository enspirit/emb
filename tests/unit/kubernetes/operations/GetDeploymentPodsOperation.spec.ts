import { createTestContext } from 'tests/setup/set.context.js';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { GetDeploymentPodsOperation } from '@/kubernetes/operations/GetDeploymentPodsOperation.js';

describe('Kubernetes / Operations / GetDeploymentPodsOperation', () => {
  let mockKubernetes: {
    core: {
      listNamespacedPod: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    mockKubernetes = {
      core: {
        listNamespacedPod: vi.fn().mockResolvedValue({ items: [] }),
      },
    };

    await createTestContext({ kubernetes: mockKubernetes as never });
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
