import { describe, expect, test, vi } from 'vitest';

import { validateConfig } from '../../../src/config';

describe('Config syntax - Project', () => {
  const vConfig = vi.fn(validateConfig);

  test('allows for the simplest shortcut', async () => {
    await vConfig({ project: 'test1' });

    expect(vConfig).toHaveResolvedWith({
      project: {
        name: 'test1',
      },
    });
  });

  test('allows for the object format', async () => {
    await vConfig({ project: { name: 'test2' } });

    expect(vConfig).toHaveResolvedWith({
      project: {
        name: 'test2',
      },
    });
  });
});
