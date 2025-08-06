import { describe, expect, test, vi } from 'vitest';

import { validateConfig } from '../../../src/config';

describe('Config syntax - Components', () => {
  const vConfig = vi.fn(validateConfig);

  test('allows for simple shortcuts', async () => {
    await vConfig({ components: ['frontend'], project: 'test1' });

    expect(vConfig).toHaveResolvedWith({
      components: [{ name: 'frontend' }],
      project: {
        name: 'test1',
      },
    });
  });
});
