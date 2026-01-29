import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { GetComponentPodOperation } from '@/kubernetes/operations/GetComponentPodOperation.js';

function createReadyPod(name: string, containers: string[]) {
  return {
    metadata: { name },
    spec: {
      containers: containers.map((c) => ({ name: c })),
    },
    status: {
      conditions: [{ type: 'Ready', status: 'True' }],
    },
  };
}

function createNotReadyPod(name: string, containers: string[]) {
  return {
    metadata: { name },
    spec: {
      containers: containers.map((c) => ({ name: c })),
    },
    status: {
      conditions: [{ type: 'Ready', status: 'False' }],
    },
  };
}

describe('Kubernetes / Operations / GetComponentPodOperation', () => {
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
      tempDirPrefix: 'embK8sGetComponentPodTest',
      embfile: {
        project: { name: 'test-k8s' },
        plugins: [],
        components: {
          api: {},
          web: {
            kubernetes: {
              selector: 'app=custom-web',
            },
          },
          worker: {
            kubernetes: {
              container: 'main',
            },
          },
        },
      },
      context: { kubernetes: mockKubernetes as never },
    });
  });

  afterEach(async () => {
    await setup.cleanup();
  });

  describe('instantiation', () => {
    test('it creates an operation instance', () => {
      const operation = new GetComponentPodOperation();
      expect(operation).toBeInstanceOf(GetComponentPodOperation);
    });
  });

  describe('schema validation', () => {
    test('it rejects missing component', async () => {
      const operation = new GetComponentPodOperation();
      await expect(
        operation.run({ namespace: 'default' } as never),
      ).rejects.toThrow();
    });

    test('it rejects missing namespace', async () => {
      const operation = new GetComponentPodOperation();
      const component = setup.monorepo.component('api');
      await expect(operation.run({ component } as never)).rejects.toThrow();
    });
  });

  describe('#run()', () => {
    describe('label selector', () => {
      test('it uses default label selector app.kubernetes.io/component={name}', async () => {
        mockKubernetes.core.listNamespacedPod.mockResolvedValue({
          items: [createReadyPod('api-pod-1', ['api'])],
        });

        const operation = new GetComponentPodOperation();
        const component = setup.monorepo.component('api');
        await operation.run({ namespace: 'production', component });

        expect(mockKubernetes.core.listNamespacedPod).toHaveBeenCalledWith({
          namespace: 'production',
          labelSelector: 'app.kubernetes.io/component=api',
        });
      });

      test('it uses custom selector from component config', async () => {
        mockKubernetes.core.listNamespacedPod.mockResolvedValue({
          items: [createReadyPod('web-pod-1', ['web'])],
        });

        const operation = new GetComponentPodOperation();
        const component = setup.monorepo.component('web');
        await operation.run({ namespace: 'production', component });

        expect(mockKubernetes.core.listNamespacedPod).toHaveBeenCalledWith({
          namespace: 'production',
          labelSelector: 'app=custom-web',
        });
      });
    });

    describe('pod selection', () => {
      test('it returns first ready pod', async () => {
        mockKubernetes.core.listNamespacedPod.mockResolvedValue({
          items: [
            createReadyPod('api-pod-1', ['api']),
            createReadyPod('api-pod-2', ['api']),
          ],
        });

        const operation = new GetComponentPodOperation();
        const component = setup.monorepo.component('api');
        const result = await operation.run({
          namespace: 'default',
          component,
        });

        expect(result.pod.metadata?.name).toBe('api-pod-1');
      });

      test('it skips non-ready pods', async () => {
        mockKubernetes.core.listNamespacedPod.mockResolvedValue({
          items: [
            createNotReadyPod('api-pod-1', ['api']),
            createReadyPod('api-pod-2', ['api']),
          ],
        });

        const operation = new GetComponentPodOperation();
        const component = setup.monorepo.component('api');
        const result = await operation.run({
          namespace: 'default',
          component,
        });

        expect(result.pod.metadata?.name).toBe('api-pod-2');
      });

      test('it throws when no ready pods found', async () => {
        mockKubernetes.core.listNamespacedPod.mockResolvedValue({
          items: [createNotReadyPod('api-pod-1', ['api'])],
        });

        const operation = new GetComponentPodOperation();
        const component = setup.monorepo.component('api');

        await expect(
          operation.run({ namespace: 'default', component }),
        ).rejects.toThrow(/No ready pods found/);
      });
    });

    describe('container selection', () => {
      test('it returns single container for single-container pod', async () => {
        mockKubernetes.core.listNamespacedPod.mockResolvedValue({
          items: [createReadyPod('api-pod-1', ['api'])],
        });

        const operation = new GetComponentPodOperation();
        const component = setup.monorepo.component('api');
        const result = await operation.run({
          namespace: 'default',
          component,
        });

        expect(result.container).toBe('api');
      });

      test('it uses container from config for multi-container pod', async () => {
        mockKubernetes.core.listNamespacedPod.mockResolvedValue({
          items: [createReadyPod('worker-pod-1', ['main', 'sidecar'])],
        });

        const operation = new GetComponentPodOperation();
        const component = setup.monorepo.component('worker');
        const result = await operation.run({
          namespace: 'default',
          component,
        });

        expect(result.container).toBe('main');
      });

      test('it throws for multi-container pod without config', async () => {
        mockKubernetes.core.listNamespacedPod.mockResolvedValue({
          items: [createReadyPod('api-pod-1', ['api', 'sidecar'])],
        });

        const operation = new GetComponentPodOperation();
        const component = setup.monorepo.component('api');

        await expect(
          operation.run({ namespace: 'default', component }),
        ).rejects.toThrow(/multiple containers/);
      });

      test('it throws when configured container not found', async () => {
        mockKubernetes.core.listNamespacedPod.mockResolvedValue({
          items: [createReadyPod('worker-pod-1', ['app', 'sidecar'])],
        });

        const operation = new GetComponentPodOperation();
        const component = setup.monorepo.component('worker');

        await expect(
          operation.run({ namespace: 'default', component }),
        ).rejects.toThrow(/Container "main" not found/);
      });
    });
  });
});

describe('Kubernetes / Operations / GetComponentPodOperation with custom selectorLabel', () => {
  let setup: TestSetup;
  let mockKubernetes: {
    core: {
      listNamespacedPod: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    mockKubernetes = {
      core: {
        listNamespacedPod: vi.fn().mockResolvedValue({
          items: [createReadyPod('api-pod-1', ['api'])],
        }),
      },
    };

    setup = await createTestSetup({
      tempDirPrefix: 'embK8sGetComponentPodCustomLabelTest',
      embfile: {
        project: { name: 'test-k8s' },
        plugins: [],
        defaults: {
          kubernetes: {
            selectorLabel: 'app',
          },
        },
        components: {
          api: {},
        },
      },
      context: { kubernetes: mockKubernetes as never },
    });
  });

  afterEach(async () => {
    await setup.cleanup();
  });

  test('it uses custom component label from project config', async () => {
    const operation = new GetComponentPodOperation();
    const component = setup.monorepo.component('api');
    await operation.run({ namespace: 'production', component });

    expect(mockKubernetes.core.listNamespacedPod).toHaveBeenCalledWith({
      namespace: 'production',
      labelSelector: 'app=api',
    });
  });
});
