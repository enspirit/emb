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
      components: { frontend: {} },
      project: { name: 'test2' },
    });

    expect(vConfig).toHaveResolvedWith({
      components: { frontend: {} },
      flavors: {},
      project: {
        name: 'test2',
        rootDir: cwd(),
      },
    });
  });

  test('allows for build args', async () => {
    await vConfig({
      project: { name: 'test2' },
      components: {
        frontend: {
          resources: {
            image: {
              type: 'docker/image',
              params: {
                buildArgs: {
                  GREETING: 'test',
                },
              },
            },
          },
        },
      },
      defaults: {
        docker: {
          labels: {
            'emb/project': 'test2',
          },
        },
      },
    });

    expect(vConfig).toHaveResolvedWith({
      components: {
        frontend: {
          resources: {
            image: {
              type: 'docker/image',
              params: {
                buildArgs: {
                  GREETING: 'test',
                },
              },
            },
          },
        },
      },
      flavors: {},
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
