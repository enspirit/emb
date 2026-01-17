import { PassThrough } from 'node:stream';
import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  ComposeLogsOperation,
  ComposeLogsOperationInputSchema,
} from '@/docker';

/**
 * Note: Full testing of ComposeLogsOperation requires mocking `spawn` from
 * node:child_process which is challenging in ESM. These tests cover the
 * instantiation and schema validation. Integration tests should be used
 * for testing actual docker compose logs interactions.
 */
describe('Docker / Compose / Operations / ComposeLogsOperation', () => {
  let setup: TestSetup;

  beforeEach(async () => {
    setup = await createTestSetup({ tempDirPrefix: 'embComposeLogsTest' });
  });

  afterEach(async () => {
    await setup.cleanup();
  });

  describe('instantiation', () => {
    test('it creates an operation instance without output stream', () => {
      const operation = new ComposeLogsOperation();
      expect(operation).toBeInstanceOf(ComposeLogsOperation);
    });

    test('it creates an operation instance with output stream', () => {
      const mockOutput = new PassThrough();
      const operation = new ComposeLogsOperation(mockOutput);
      expect(operation).toBeInstanceOf(ComposeLogsOperation);
    });
  });

  describe('ComposeLogsOperationInputSchema', () => {
    test('it accepts undefined input', () => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      const result = ComposeLogsOperationInputSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    test('it accepts empty object', () => {
      const result = ComposeLogsOperationInputSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    test('it accepts services array', () => {
      const result = ComposeLogsOperationInputSchema.safeParse({
        services: ['api', 'web'],
      });
      expect(result.success).toBe(true);
      expect(result.data?.services).toEqual(['api', 'web']);
    });

    test('it accepts follow boolean', () => {
      const result = ComposeLogsOperationInputSchema.safeParse({
        follow: false,
      });
      expect(result.success).toBe(true);
      expect(result.data?.follow).toBe(false);
    });

    test('it accepts timestamps boolean', () => {
      const result = ComposeLogsOperationInputSchema.safeParse({
        timestamps: true,
      });
      expect(result.success).toBe(true);
      expect(result.data?.timestamps).toBe(true);
    });

    test('it accepts tail number', () => {
      const result = ComposeLogsOperationInputSchema.safeParse({
        tail: 100,
      });
      expect(result.success).toBe(true);
      expect(result.data?.tail).toBe(100);
    });

    test('it accepts all options combined', () => {
      const input = {
        services: ['api', 'web', 'db'],
        follow: true,
        timestamps: true,
        tail: 50,
      };
      const result = ComposeLogsOperationInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(input);
    });

    test('it rejects non-string services', () => {
      const result = ComposeLogsOperationInputSchema.safeParse({
        services: [123, 456],
      });
      expect(result.success).toBe(false);
    });

    test('it rejects non-boolean follow', () => {
      const result = ComposeLogsOperationInputSchema.safeParse({
        follow: 'yes',
      });
      expect(result.success).toBe(false);
    });

    test('it rejects non-boolean timestamps', () => {
      const result = ComposeLogsOperationInputSchema.safeParse({
        timestamps: 'true',
      });
      expect(result.success).toBe(false);
    });

    test('it rejects non-number tail', () => {
      const result = ComposeLogsOperationInputSchema.safeParse({
        tail: '100',
      });
      expect(result.success).toBe(false);
    });
  });
});
