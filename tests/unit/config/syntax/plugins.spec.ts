import { beforeEach, describe, expect, test, vi } from 'vitest';

import { validateUserConfig } from '@/config';

describe('Config syntax - Plugins', () => {
  let vConfig: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vConfig = vi.fn(validateUserConfig);
  });

  test('allows for plugins', async () => {
    await vConfig({
      project: { name: 'test1' },
      plugins: [
        {
          config: ['.env', '.env.commons'],
          name: 'dotenv',
        },
      ],
    });

    expect(vConfig).toHaveResolvedWith({
      project: {
        name: 'test1',
      },
      plugins: [
        {
          config: ['.env', '.env.commons'],
          name: 'dotenv',
        },
      ],
    });
  });
});
