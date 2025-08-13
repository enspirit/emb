import { cwd } from 'node:process';
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
      components: {},
      flavors: {},
      defaults: {
        docker: {
          tag: 'staging',
        },
      },
      project: {
        name: 'test1',
        rootDir: cwd(),
      },
    });
  });
});
