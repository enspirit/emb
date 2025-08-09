import { cwd } from 'node:process';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { validateUserConfig } from '@/config';

describe('Config syntax - Plugins', () => {
  let vConfig: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vConfig = vi.fn(validateUserConfig);
  });

  test('allows for plugins', async () => {
    await vConfig({
      plugins: [
        {
          config: ['.env', '.env.commons'],
          name: 'dotenv',
        },
      ],
      project: 'test1',
    });

    expect(vConfig).toHaveResolvedWith({
      components: [],
      defaults: {
        docker: {
          labels: {
            'emb/project': 'test1',
          },
        },
      },
      plugins: [
        {
          config: ['.env', '.env.commons'],
          name: 'dotenv',
        },
      ],
      project: {
        name: 'test1',
        rootDir: cwd(),
      },
    });
  });
});
