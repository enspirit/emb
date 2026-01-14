import { IResourceBuilder } from '@';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  ResourceBuildContext,
  ResourceFactory,
} from '../../../../src/monorepo/resources/ResourceFactory.js';

class MockResourceBuilder implements IResourceBuilder<
  unknown,
  unknown,
  unknown
> {
  constructor(public context: ResourceBuildContext<unknown>) {}

  async getReference(): Promise<string> {
    return 'mock-ref';
  }

  async build(): Promise<{
    input: unknown;
    operation: { run: () => Promise<unknown> };
  }> {
    return {
      input: {},
      operation: { run: async () => ({}) },
    };
  }
}

describe('Monorepo / Resources / ResourceFactory', () => {
  const originalTypes = {
    ...(ResourceFactory as unknown as { types: Record<string, unknown> }).types,
  };

  beforeEach(() => {
    // Reset the static registry before each test
    (ResourceFactory as unknown as { types: Record<string, unknown> }).types =
      {};
  });

  afterEach(() => {
    // Restore the original types after all tests
    (ResourceFactory as unknown as { types: Record<string, unknown> }).types = {
      ...originalTypes,
    };
  });

  describe('#register()', () => {
    test('it registers a new resource type', () => {
      ResourceFactory.register('test-type', MockResourceBuilder);

      const { types } = ResourceFactory as unknown as {
        types: Record<string, unknown>;
      };
      expect(types['test-type']).toBe(MockResourceBuilder);
    });

    test('it throws an error when registering a duplicate type', () => {
      ResourceFactory.register('duplicate-type', MockResourceBuilder);

      expect(() => {
        ResourceFactory.register('duplicate-type', MockResourceBuilder);
      }).toThrow('Resource type `duplicate-type` already registered');
    });
  });

  describe('#factor()', () => {
    test('it creates a new instance of a registered builder', () => {
      ResourceFactory.register('factored-type', MockResourceBuilder);

      const context: ResourceBuildContext<unknown> = {
        config: {
          id: 'test-resource',
          type: 'factored-type',
          params: {},
        },
        component: {} as never,
        monorepo: {} as never,
      };

      const builder = ResourceFactory.factor('factored-type', context);

      expect(builder).toBeInstanceOf(MockResourceBuilder);
      expect((builder as MockResourceBuilder).context).toBe(context);
    });

    test('it throws an error for unknown resource type', () => {
      const context: ResourceBuildContext<unknown> = {
        config: {
          id: 'unknown-resource',
          type: 'unknown-type',
          params: {},
        },
        component: {} as never,
        monorepo: {} as never,
      };

      expect(() => {
        ResourceFactory.factor('unknown-type', context);
      }).toThrow('Unknown resource type `unknown-type` (unknown-resource)');
    });
  });
});
