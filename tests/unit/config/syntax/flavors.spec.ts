import { cwd } from 'node:process';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { validateUserConfig } from '@/config';

describe('Config syntax - Flavors', () => {
  let vConfig: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vConfig = vi.fn(validateUserConfig);
  });

  test('allows for flavors', async () => {
    await vConfig({
      project: { name: 'test1' },
      flavors: {
        staging: {
          defaults: {
            docker: {
              tag: 'staging',
            },
          },
        },
      },
    });

    expect(vConfig).toHaveResolvedWith({
      project: {
        name: 'test1',
        rootDir: cwd(),
      },
      components: {},
      flavors: {
        staging: {
          defaults: {
            docker: {
              tag: 'staging',
            },
          },
        },
      },
    });
  });
});
