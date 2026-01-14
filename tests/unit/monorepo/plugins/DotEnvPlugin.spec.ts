import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rimraf } from 'rimraf';
import { beforeAll, describe, expect, test } from 'vitest';

import { DotEnvPlugin, Monorepo } from '@/monorepo';

const withAProjectLookingLike = async (
  envFiles: Record<string, string>,
  callback: (rootDir: string) => Promise<void>,
) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'embDotenvTest'));

  await Promise.all(
    Object.entries(envFiles).map(async ([path, content]) => {
      await writeFile(join(rootDir, path), content);
    }),
  );

  try {
    await callback(rootDir);
  } finally {
    rimraf(rootDir);
  }
};

const repoWithPlugin = async (
  rootDir: string,
  config: string[],
): Promise<Monorepo> => {
  const repo = new Monorepo(
    {
      project: {
        name: 'test',
      },
      plugins: [
        {
          name: DotEnvPlugin.name,
          config,
        },
      ],
      components: {},
    },
    rootDir,
  );

  await repo.init();

  return repo;
};

describe('Plugins / DotEnvPlugin', () => {
  beforeAll(async () => {});

  describe('.name', () => {
    test('it has the correct static name', () => {
      expect(DotEnvPlugin.name).toBe('dotenv');
    });
  });

  describe('#init()', () => {
    test('it loads environment variables from .env file', async () => {
      // Save original env value
      const originalValue = process.env.DOTENV_PLUGIN_TEST_VAR;

      await withAProjectLookingLike(
        {
          '.env': 'DOTENV_PLUGIN_TEST_VAR=test_value_123',
        },
        async (rootDir) => {
          await repoWithPlugin(rootDir, ['.env']);

          expect(process.env.DOTENV_PLUGIN_TEST_VAR).toBe('test_value_123');
        },
      );

      // Restore original env value
      if (originalValue === undefined) {
        delete process.env.DOTENV_PLUGIN_TEST_VAR;
      } else {
        process.env.DOTENV_PLUGIN_TEST_VAR = originalValue;
      }
    });

    test('it loads environment variables from multiple files', async () => {
      const originalValue1 = process.env.DOTENV_MULTI_VAR1;
      const originalValue2 = process.env.DOTENV_MULTI_VAR2;

      await withAProjectLookingLike(
        {
          '.env': 'DOTENV_MULTI_VAR1=from_env',
          '.env.local': 'DOTENV_MULTI_VAR2=from_local',
        },
        async (rootDir) => {
          await repoWithPlugin(rootDir, ['.env', '.env.local']);

          expect(process.env.DOTENV_MULTI_VAR1).toBe('from_env');
          expect(process.env.DOTENV_MULTI_VAR2).toBe('from_local');
        },
      );

      // Restore original values
      if (originalValue1 === undefined) {
        delete process.env.DOTENV_MULTI_VAR1;
      } else {
        process.env.DOTENV_MULTI_VAR1 = originalValue1;
      }

      if (originalValue2 === undefined) {
        delete process.env.DOTENV_MULTI_VAR2;
      } else {
        process.env.DOTENV_MULTI_VAR2 = originalValue2;
      }
    });

    test('it handles non-existent env files gracefully', async () => {
      await withAProjectLookingLike({}, async (rootDir) => {
        // Should not throw when env file doesn't exist (quiet: true)
        await expect(
          repoWithPlugin(rootDir, ['.env.nonexistent']),
        ).resolves.toBeDefined();
      });
    });
  });
});
