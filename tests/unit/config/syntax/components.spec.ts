import { cwd } from 'node:process';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { validateUserConfig } from '@/config';

describe('Config syntax - Components', () => {
  let vConfig: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vConfig = vi.fn(validateUserConfig);
  });

  test('allows for simple shortcuts', async () => {
    await vConfig({ components: ['frontend'], project: 'test1' });

    expect(vConfig).toHaveResolvedWith({
      components: [
        {
          context: 'frontend',
          name: 'frontend',
        },
      ],
      defaults: {
        docker: {
          labels: {
            'emb/project': 'test1',
          },
        },
      },
      project: {
        name: 'test1',
        rootDir: cwd(),
      },
    });
  });

  test('allows for object format', async () => {
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
          buildArgs: {
            GREETING: 'test',
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
          buildArgs: {
            GREETING: 'test',
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
