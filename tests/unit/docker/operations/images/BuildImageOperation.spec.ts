import { PassThrough } from 'node:stream';
import { describe, expect, test } from 'vitest';

import { BuildImageOperation, BuildImageOperationInputSchema } from '@/docker';

/**
 * Note: Full testing of BuildImageOperation requires mocking `spawn` from
 * node:child_process which is challenging in ESM. These tests cover the
 * instantiation and schema validation. Integration tests should be used
 * for testing actual docker build interactions.
 */
describe('Docker / BuildImageOperation', () => {
  describe('instantiation', () => {
    test('it can be instantiated without an output stream', () => {
      const operation = new BuildImageOperation();

      expect(operation).toBeInstanceOf(BuildImageOperation);
    });

    test('it can be instantiated with an output stream', () => {
      const output = new PassThrough();

      const operation = new BuildImageOperation(output);

      expect(operation).toBeInstanceOf(BuildImageOperation);
    });
  });

  describe('BuildImageOperationInputSchema', () => {
    test('it validates a minimal input', () => {
      const input = {
        context: '/path/to/context',
        src: ['file1.ts', 'file2.ts'],
      };

      const result = BuildImageOperationInputSchema.safeParse(input);

      expect(result.success).toBe(true);
      expect(result.data?.context).toBe('/path/to/context');
      expect(result.data?.dockerfile).toBe('Dockerfile');
    });

    test('it accepts all optional fields', () => {
      const input = {
        context: '/path/to/context',
        dockerfile: 'Dockerfile.prod',
        src: ['src/'],
        tag: 'myapp:v1.0.0',
        buildArgs: {
          NODE_ENV: 'production',
        },
        labels: {
          version: '1.0.0',
        },
        target: 'runtime',
      };

      const result = BuildImageOperationInputSchema.safeParse(input);

      expect(result.success).toBe(true);
      expect(result.data?.dockerfile).toBe('Dockerfile.prod');
      expect(result.data?.tag).toBe('myapp:v1.0.0');
      expect(result.data?.target).toBe('runtime');
      expect(result.data?.buildArgs).toEqual({ NODE_ENV: 'production' });
      expect(result.data?.labels).toEqual({ version: '1.0.0' });
    });

    test('it requires context field', () => {
      const input = {
        src: ['file1.ts'],
      };

      const result = BuildImageOperationInputSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    test('it requires src field', () => {
      const input = {
        context: '/path/to/context',
      };

      const result = BuildImageOperationInputSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    test('it validates src is an array of strings', () => {
      const input = {
        context: '/path/to/context',
        src: 'not-an-array',
      };

      const result = BuildImageOperationInputSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    test('it validates buildArgs is a record of strings', () => {
      const input = {
        context: '/path/to/context',
        src: [],
        buildArgs: {
          key: 123, // should be string
        },
      };

      const result = BuildImageOperationInputSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    test('it validates labels is a record of strings', () => {
      const input = {
        context: '/path/to/context',
        src: [],
        labels: {
          version: 123, // should be string
        },
      };

      const result = BuildImageOperationInputSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});
