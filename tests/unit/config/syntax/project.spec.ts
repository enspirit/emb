import { cwd } from 'node:process';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { validateUserConfig } from '@/config';

describe('Config syntax - Project', () => {
  let vConfig: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vConfig = vi.fn(validateUserConfig);
  });

  test('allows for the object format', async () => {
    await vConfig({ project: { name: 'test2' } });

    expect(vConfig).toHaveResolvedWith({
      components: {},
      flavors: {},
      project: {
        name: 'test2',
        rootDir: cwd(),
      },
    });
  });

  test('allows for a different project rootDir', async () => {
    await vConfig({ project: { name: 'test3', rootDir: 'examples' } });

    expect(vConfig).toHaveResolvedWith({
      components: {},
      flavors: {},
      project: {
        name: 'test3',
        rootDir: 'examples',
      },
    });
  });
});
