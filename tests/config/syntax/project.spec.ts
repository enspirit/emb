import { cwd } from 'node:process';
import { describe, expect, test, vi } from 'vitest';

import { validateUserConfig } from '../../../src/config';

describe('Config syntax - Project', () => {
  const vConfig = vi.fn(validateUserConfig);

  test('allows for the simplest shortcut', async () => {
    await vConfig({ project: 'test1' });

    expect(vConfig).toHaveResolvedWith({
      components: [],
      project: {
        name: 'test1',
        rootDir: cwd(),
      },
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
    });
  });

  test('allows for a different project rootDIr', async () => {
    await vConfig({ project: { name: 'test3', rootDir: 'examples' } });

    expect(vConfig).toHaveResolvedWith({
      components: [],
      project: {
        name: 'test3',
        rootDir: 'examples',
      },
    });
  });
});
