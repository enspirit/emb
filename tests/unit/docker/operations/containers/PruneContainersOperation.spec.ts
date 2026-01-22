import { EmbContext, getContext } from '@';
import { beforeEach, describe, expect, Mock, test } from 'vitest';

import { PruneContainersOperation } from '@/docker';
import { createTestContext } from 'tests/setup/set.context.js';

describe('Docker / PruneContainersOperation', () => {
  let context: EmbContext;
  let pruneContainers: Mock;
  let operation: PruneContainersOperation;

  beforeEach(async () => {
    await createTestContext();
    context = getContext();
    operation = new PruneContainersOperation();
    pruneContainers = context.docker.pruneContainers as Mock;
    pruneContainers.mockResolvedValue({
      ContainersDeleted: ['container1', 'container2'],
      SpaceReclaimed: 1024,
    });
  });

  describe('when used with no parameters', () => {
    test('it calls pruneContainers without filters', async () => {
      // @ts-expect-error Schema is optional but TS inference doesn't support undefined
      await operation.run();

      expect(pruneContainers).toHaveBeenCalledExactlyOnceWith({
        filters: undefined,
      });
    });

    test('it returns the prune result', async () => {
      // @ts-expect-error Schema is optional but TS inference doesn't support undefined
      const result = await operation.run();

      expect(result).toEqual({
        ContainersDeleted: ['container1', 'container2'],
        SpaceReclaimed: 1024,
      });
    });
  });

  describe('when used with empty filters', () => {
    test('it calls pruneContainers without filters', async () => {
      await operation.run({});

      expect(pruneContainers).toHaveBeenCalledExactlyOnceWith({
        filters: undefined,
      });
    });
  });

  describe('when used with label filters', () => {
    test('it passes the label filters to pruneContainers', async () => {
      await operation.run({
        filters: {
          label: ['app=myapp', 'env=test'],
        },
      });

      expect(pruneContainers).toHaveBeenCalledExactlyOnceWith({
        filters: {
          label: ['app=myapp', 'env=test'],
        },
      });
    });

    test('it handles a single label', async () => {
      await operation.run({
        filters: {
          label: ['cleanup=true'],
        },
      });

      expect(pruneContainers).toHaveBeenCalledExactlyOnceWith({
        filters: {
          label: ['cleanup=true'],
        },
      });
    });
  });
});
