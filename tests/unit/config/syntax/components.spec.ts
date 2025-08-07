import { cwd } from 'node:process';
import { describe, expect, test, vi, beforeEach } from 'vitest';

import { validateUserConfig } from '../../../../src/config/index';

describe('Config syntax - Components', () => {

  let vConfig: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vConfig = vi.fn(validateUserConfig);
  });

  test('allows for simple shortcuts', async () => {
    await vConfig({ components: ['frontend'], project: 'test1' });

    expect(vConfig).toHaveResolvedWith({
      components: [{
        name: 'frontend',
        context: 'frontend'
      }],
      defaults: {
        docker: {
          labels: {
            'emb/project': 'test1'
          }
        }
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
            'emb/project': 'test2'
          }
        }
      },
      project: {
        name: 'test2',
        rootDir: cwd(),
      },
    });
  });

  test('allows for build args', async () => {
    await vConfig({
      defaults: {
        docker: {
          labels: {
            'emb/project': 'test2'
          }
        }
      },
      components: [
        {
          buildArgs: {
            GREETING: 'test',
          },
          name: 'frontend',
        },
      ],
      project: 'test2',
    });

    expect(vConfig).toHaveResolvedWith({
      defaults: {
        docker: {
          labels: {
            'emb/project': 'test2'
          }
        }
      },
      components: [
        {
          buildArgs: {
            GREETING: 'test',
          },
          name: 'frontend',
        },
      ],
      project: {
        name: 'test2',
        rootDir: cwd(),
      },
    });
  });
});
