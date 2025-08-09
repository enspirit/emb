import { cwd } from 'node:process';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { validateUserConfig } from '@/config';

describe('Config syntax - Components', () => {
  let vConfig: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vConfig = vi.fn(validateUserConfig);
  });

  test('allows for simplest object format', async () => {
    await vConfig({
      components: [{ name: 'frontend' }],
      project: 'test2',
    });

    expect(vConfig).toHaveResolvedWith({
      components: [{ name: 'frontend' }],
      defaults: {
        docker: {
          labels: {
            'emb/project': 'test2',
          },
        },
      },
      project: {
        name: 'test2',
        rootDir: cwd(),
      },
    });
  });

  test('allows for build args', async () => {
    await vConfig({
      components: [
        {
          docker: {
            buildArgs: {
              GREETING: 'test',
            },
          },
          name: 'frontend',
        },
      ],
      defaults: {
        docker: {
          labels: {
            'emb/project': 'test2',
          },
        },
      },
      project: 'test2',
    });

    expect(vConfig).toHaveResolvedWith({
      components: [
        {
          docker: {
            buildArgs: {
              GREETING: 'test',
            },
          },
          name: 'frontend',
        },
      ],
      defaults: {
        docker: {
          labels: {
            'emb/project': 'test2',
          },
        },
      },
      project: {
        name: 'test2',
        rootDir: cwd(),
      },
    });
  });
});
