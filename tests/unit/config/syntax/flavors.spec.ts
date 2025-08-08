import { cwd } from 'node:process';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { validateUserConfig } from '../../../../src/config/index.js';

describe('Config syntax - Flavors', () => {
  let vConfig: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vConfig = vi.fn(validateUserConfig);
  });

  test('allows for flavors', async () => {
    await vConfig({
      flavors: [
        {
          defaults: {
            docker: {
              tag: 'staging',
            },
          },
          name: 'staging',
        },
      ],
      project: 'test1',
    });

    expect(vConfig).toHaveResolvedWith({
      components: [],
      defaults: {
        docker: {
          labels: {
            'emb/project': 'test1',
          },
        },
      },
      flavors: [
        {
          defaults: {
            docker: {
              tag: 'staging',
            },
          },
          name: 'staging',
        },
      ],
      project: {
        name: 'test1',
        rootDir: cwd(),
      },
    });
  });
});
