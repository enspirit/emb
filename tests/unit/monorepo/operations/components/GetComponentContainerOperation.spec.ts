import { EmbContext, getContext } from '@';
import { ContainerInfo } from 'dockerode';
import { createTestContext } from 'tests/setup/set.context.js';
import { beforeEach, describe, expect, Mock, test } from 'vitest';

import { GetComponentContainerOperation } from '../../../../../src/monorepo/operations/components/GetComponentContainerOperation.js';

describe('Monorepo / Operations / GetComponentContainerOperation', () => {
  let context: EmbContext;
  let listContainers: Mock;
  let operation: GetComponentContainerOperation;

  const mockContainer: ContainerInfo = {
    Id: 'container-123',
    Names: ['/test-container'],
    Image: 'test-image',
    ImageID: 'sha256:abc123',
    Command: '/bin/sh',
    Created: Date.now(),
    Ports: [],
    Labels: {
      'emb/project': 'test-project',
      'emb/component': 'api',
    },
    State: 'running',
    Status: 'Up 5 minutes',
    HostConfig: { NetworkMode: 'bridge' },
    NetworkSettings: { Networks: {} },
    Mounts: [],
  };

  beforeEach(async () => {
    await createTestContext();
    context = getContext();
    operation = new GetComponentContainerOperation();
    listContainers = context.docker.listContainers as Mock;
  });

  describe('#run()', () => {
    test('it returns the container when exactly one matches', async () => {
      listContainers.mockResolvedValue([mockContainer]);

      const result = await operation.run('api');

      expect(result).toBe(mockContainer);
      expect(listContainers).toHaveBeenCalledWith({
        filters: {
          label: [`emb/project=${context.monorepo.name}`, 'emb/component=api'],
        },
      });
    });

    test('it accepts a Component instance as input', async () => {
      listContainers.mockResolvedValue([mockContainer]);
      // Use a real Component from the test fixture monorepo
      const gatewayComponent = context.monorepo.component('gateway');

      const result = await operation.run(gatewayComponent);

      expect(result).toBe(mockContainer);
      expect(listContainers).toHaveBeenCalledWith({
        filters: {
          label: [
            `emb/project=${context.monorepo.name}`,
            'emb/component=gateway',
          ],
        },
      });
    });

    test('it throws an error when no container is found', async () => {
      listContainers.mockResolvedValue([]);

      await expect(operation.run('api')).rejects.toThrow(
        "Could not find a running container for 'api'",
      );
    });

    test('it throws an error when multiple containers are found', async () => {
      const container2 = { ...mockContainer, Id: 'container-456' };
      listContainers.mockResolvedValue([mockContainer, container2]);

      await expect(operation.run('api')).rejects.toThrow(
        "More than one running container found for 'api'",
      );
    });
  });
});
