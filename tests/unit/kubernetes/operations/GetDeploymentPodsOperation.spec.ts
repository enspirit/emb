import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { GetDeploymentPodsOperation } from '@/kubernetes/operations/GetDeploymentPodsOperation.js';

describe('Kubernetes / Operations / GetDeploymentPodsOperation', () => {
  let setup: TestSetup;
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

    setup = await createTestSetup({
      tempDirPrefix: 'embK8sGetDeploymentPodsTest',
      embfile: {
        project: { name: 'test-k8s' },
        plugins: [],
        components: {},
      },
      context: { kubernetes: mockKubernetes as never },
    });
  });

  afterEach(async () => {
    await setup.cleanup();
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
    test('it uses default component label', async () => {
      const operation = new GetDeploymentPodsOperation();
      await operation.run({ namespace: 'production', deployment: 'api' });

      expect(mockKubernetes.core.listNamespacedPod).toHaveBeenCalledWith({
        namespace: 'production',
        labelSelector: 'app.kubernetes.io/component=api',
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

describe('Kubernetes / Operations / GetDeploymentPodsOperation with custom selectorLabel', () => {
  let setup: TestSetup;
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

    setup = await createTestSetup({
      tempDirPrefix: 'embK8sGetDeploymentPodsCustomLabelTest',
      embfile: {
        project: { name: 'test-k8s' },
        plugins: [],
        components: {},
        defaults: {
          kubernetes: {
            selectorLabel: 'app',
          },
        },
      },
      context: { kubernetes: mockKubernetes as never },
    });
  });

  afterEach(async () => {
    await setup.cleanup();
  });

  test('it uses custom component label from config', async () => {
    const operation = new GetDeploymentPodsOperation();
    await operation.run({ namespace: 'production', deployment: 'api' });

    expect(mockKubernetes.core.listNamespacedPod).toHaveBeenCalledWith({
      namespace: 'production',
      labelSelector: 'app=api',
    });
  });
});
