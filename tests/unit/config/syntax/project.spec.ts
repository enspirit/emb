import { cwd } from 'node:process';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { validateUserConfig } from '../../../../src/config';

describe('Config syntax - Project', () => {

  let vConfig: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vConfig = vi.fn(validateUserConfig);
  });

  test('allows for the simplest shortcut', async () => {
    await vConfig({ project: 'test1' });

    expect(vConfig).toHaveResolvedWith({
      components: [],
      project: {
        name: 'test1',
        rootDir: cwd(),
      },
      defaults: {
        docker: {
          labels: {
            'emb/project': 'test1'
          }
        }
      }
    });
  });

  test('allows for the object format', async () => {
    await vConfig({ project: { name: 'test2' } });

    expect(vConfig).toHaveResolvedWith({
      components: [],
      project: {
        name: 'test2',
        rootDir: cwd(),
      },
      defaults: {
        docker: {
          labels: {
            'emb/project': 'test2'
          }
        }
      }
    });
  });

  test('allows for a different project rootDir', async () => {
    await vConfig({ project: { name: 'test3', rootDir: 'examples' } });

    expect(vConfig).toHaveResolvedWith({
      components: [],
      defaults: {
        docker: {
          labels: {
            'emb/project': 'test3'
          }
        }
      },
      project: {
        name: 'test3',
        rootDir: 'examples',
      },
    });
  });
});
