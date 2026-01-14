import { Monorepo, ResourceInfo } from '@';
import { Writable } from 'node:stream';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { IOperation } from '@/operations/types.js';

import { SentinelFileBasedBuilder } from '../../../../../src/monorepo/resources/abstract/SentinelFileBasedBuilder.js';
import { ResourceBuildContext } from '../../../../../src/monorepo/resources/ResourceFactory.js';

// Test implementation
type TestInput = { value: string };
type TestOutput = { result: string };
type TestSentinelData = { mtime: number; hash: string };

class TestBuilder extends SentinelFileBasedBuilder<
  TestInput,
  TestOutput,
  TestSentinelData
> {
  public mustBuildReturnValue: TestSentinelData | undefined = undefined;

  async _build(
    _resource: ResourceInfo<TestInput>,
    _out?: Writable,
  ): Promise<{
    input: TestInput;
    operation: IOperation<TestInput, TestOutput>;
  }> {
    return {
      input: { value: 'test' },
      operation: {
        run: async () => ({ result: 'done' }),
      } as IOperation<TestInput, TestOutput>,
    };
  }

  async _mustBuild(
    _resource: ResourceInfo<TestInput>,
  ): Promise<TestSentinelData | undefined> {
    return this.mustBuildReturnValue;
  }

  async getReference(): Promise<string> {
    return 'test-reference';
  }
}

const createResource = (): ResourceInfo<TestInput> => ({
  id: 'test-component:test-resource',
  name: 'test-resource',
  component: 'test-component',
  type: 'test',
  params: { value: 'test' },
});

describe('Monorepo / Resources / SentinelFileBasedBuilder', () => {
  let mockMonorepo: Monorepo;
  let builder: TestBuilder;
  let mockStore: {
    stat: ReturnType<typeof vi.fn>;
    readFile: ReturnType<typeof vi.fn>;
    writeFile: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockStore = {
      stat: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
    };

    mockMonorepo = {
      store: mockStore,
      currentFlavor: 'default',
    } as unknown as Monorepo;

    const context: ResourceBuildContext<TestInput> = {
      config: createResource(),
      component: {} as never,
      monorepo: mockMonorepo,
    };

    builder = new TestBuilder(context);
  });

  describe('#mustBuild()', () => {
    test('it returns sentinel data when no sentinel file exists (first build)', async () => {
      mockStore.stat.mockResolvedValue();
      builder.mustBuildReturnValue = { mtime: Date.now(), hash: 'abc123' };

      const result = await builder.mustBuild(createResource());

      expect(result).toEqual(builder.mustBuildReturnValue);
    });

    test('it returns undefined when _mustBuild returns undefined', async () => {
      builder.mustBuildReturnValue = undefined;

      const result = await builder.mustBuild(createResource());

      expect(result).toBeUndefined();
    });

    test('it returns sentinel data when sentinel file is older (cache miss)', async () => {
      const oldTime = Date.now() - 10_000;
      const newTime = Date.now();

      mockStore.stat.mockResolvedValue({ mtime: new Date(oldTime) });
      mockStore.readFile.mockResolvedValue(
        JSON.stringify({ mtime: oldTime, hash: 'old' }),
      );
      builder.mustBuildReturnValue = { mtime: newTime, hash: 'new' };

      const result = await builder.mustBuild(createResource());

      expect(result).toEqual(builder.mustBuildReturnValue);
    });

    test('it returns undefined when sentinel file is newer (cache hit)', async () => {
      const oldTime = Date.now() - 10_000;
      const sentinelTime = Date.now();

      mockStore.stat.mockResolvedValue({ mtime: new Date(sentinelTime) });
      mockStore.readFile.mockResolvedValue(
        JSON.stringify({ mtime: oldTime, hash: 'cached' }),
      );
      builder.mustBuildReturnValue = { mtime: oldTime, hash: 'same' };

      const result = await builder.mustBuild(createResource());

      expect(result).toBeUndefined();
    });
  });

  describe('#build()', () => {
    test('it returns input and operation from _build', async () => {
      const result = await builder.build(createResource());

      expect(result.input).toEqual({ value: 'test' });
      expect(result.operation).toBeDefined();
    });
  });

  describe('#commit()', () => {
    test('it stores sentinel data after successful build', async () => {
      mockStore.writeFile.mockResolvedValue();

      const reason: TestSentinelData = { mtime: Date.now(), hash: 'abc' };
      await builder.commit(createResource(), { result: 'done' }, reason);

      expect(mockStore.writeFile).toHaveBeenCalledWith(
        'sentinels/flavors/default/test-component/test-resource.built',
        JSON.stringify(reason),
      );
    });
  });
});
