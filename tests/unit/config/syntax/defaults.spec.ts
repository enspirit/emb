import { beforeEach, describe, expect, test, vi } from 'vitest';

import { validateUserConfig } from '@/config';

describe('Config syntax - Defaults', () => {
  let vConfig: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vConfig = vi.fn(validateUserConfig);
  });

  test('allows for defaults overrides', async () => {
    await vConfig({
      defaults: {
        docker: {
          tag: 'staging',
        },
      },
      project: { name: 'test1' },
    });

    expect(vConfig).toHaveResolvedWith({
      defaults: {
        docker: {
          tag: 'staging',
        },
      },
      project: {
        name: 'test1',
      },
    });
  });

  test('allows defaults.build.concurrency as a positive integer', async () => {
    await expect(
      validateUserConfig({
        defaults: { build: { concurrency: 4 } },
        project: { name: 'test' },
      }),
    ).resolves.toBeDefined();
  });

  test("allows defaults.build.concurrency = 'auto'", async () => {
    await expect(
      validateUserConfig({
        defaults: { build: { concurrency: 'auto' } },
        project: { name: 'test' },
      }),
    ).resolves.toBeDefined();
  });

  test('rejects a non-positive build concurrency', async () => {
    await expect(
      validateUserConfig({
        defaults: { build: { concurrency: 0 } },
        project: { name: 'test' },
      }),
    ).rejects.toThrow();
  });

  test('rejects a non-numeric, non-auto build concurrency', async () => {
    await expect(
      validateUserConfig({
        defaults: { build: { concurrency: 'fast' } },
        project: { name: 'test' },
      }),
    ).rejects.toThrow();
  });
});
