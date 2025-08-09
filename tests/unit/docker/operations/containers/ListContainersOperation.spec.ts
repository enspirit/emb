import { EmbContext, getContext } from '@';
import { beforeEach, describe, expect, Mock, test } from 'vitest';

import { ListContainersOperation } from '@/docker';

describe('Docker / ListContainersOperation', () => {
  let context: EmbContext;
  let listContainers: Mock;
  let operation: ListContainersOperation;

  beforeEach(() => {
    context = getContext();
    operation = new ListContainersOperation();
    listContainers = context.docker.listContainers as Mock;
  });

  describe('when used with no parameters', () => {
    test('it works properly', async () => {
      // @ts-expect-error I don't know why undefined is not supported
      // despite z.infer<> doing its job properly
      await operation.run();

      expect(listContainers).toHaveBeenCalledExactlyOnceWith({});
    });
  });

  describe('when used with parameters', () => {
    test('it works properly', async () => {
      await operation.run({ all: true });
      expect(listContainers).toHaveBeenCalledExactlyOnceWith({ all: true });
      listContainers.mockReset();

      await operation.run({ limit: 42 });
      expect(listContainers).toHaveBeenCalledExactlyOnceWith({
        limit: 42,
      });
      listContainers.mockReset();

      await operation.run({ all: true, limit: 42 });
      expect(listContainers).toHaveBeenCalledExactlyOnceWith({
        all: true,
        limit: 42,
      });
      listContainers.mockReset();

      await operation.run({
        filters: {
          label: ['foo', 'bar', 'value=42'],
        },
      });
      expect(listContainers).toHaveBeenCalledExactlyOnceWith({
        filters: { label: ['foo', 'bar', 'value=42'] },
      });
      listContainers.mockReset();
    });
  });
});
