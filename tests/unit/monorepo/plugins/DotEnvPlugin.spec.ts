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
  env: Record<string, string> = {},
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
      env,
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

    test('it lets the last file win when several define the same variable', async () => {
      // Reported bug: with `config: ['.env.commons', '.env']`, a variable
      // defined in both takes its value from `.env.commons` (the first file).
      // Users coming from docker-compose expect the opposite: files listed
      // later override the ones listed before.
      const originalValue = process.env.DOTENV_LAST_WINS_VAR;
      delete process.env.DOTENV_LAST_WINS_VAR;

      await withAProjectLookingLike(
        {
          '.env.commons': 'DOTENV_LAST_WINS_VAR=from_commons',
          '.env': 'DOTENV_LAST_WINS_VAR=from_env',
        },
        async (rootDir) => {
          await repoWithPlugin(rootDir, ['.env.commons', '.env']);

          expect(process.env.DOTENV_LAST_WINS_VAR).toBe('from_env');
        },
      );

      if (originalValue === undefined) {
        delete process.env.DOTENV_LAST_WINS_VAR;
      } else {
        process.env.DOTENV_LAST_WINS_VAR = originalValue;
      }
    });

    test('it lets the last file win, whatever the order of the files', async () => {
      // Same as above, with the two files swapped: the value must follow the
      // configured order, not the file names.
      const originalValue = process.env.DOTENV_LAST_WINS_REVERSED_VAR;
      delete process.env.DOTENV_LAST_WINS_REVERSED_VAR;

      await withAProjectLookingLike(
        {
          '.env.commons': 'DOTENV_LAST_WINS_REVERSED_VAR=from_commons',
          '.env': 'DOTENV_LAST_WINS_REVERSED_VAR=from_env',
        },
        async (rootDir) => {
          await repoWithPlugin(rootDir, ['.env', '.env.commons']);

          expect(process.env.DOTENV_LAST_WINS_REVERSED_VAR).toBe(
            'from_commons',
          );
        },
      );

      if (originalValue === undefined) {
        delete process.env.DOTENV_LAST_WINS_REVERSED_VAR;
      } else {
        process.env.DOTENV_LAST_WINS_REVERSED_VAR = originalValue;
      }
    });

    test('it does not override variables already set in the environment', async () => {
      // Files must never win over the actual shell environment, whatever the
      // precedence between them.
      const originalValue = process.env.DOTENV_SHELL_WINS_VAR;
      process.env.DOTENV_SHELL_WINS_VAR = 'from_shell';

      await withAProjectLookingLike(
        {
          '.env.commons': 'DOTENV_SHELL_WINS_VAR=from_commons',
          '.env': 'DOTENV_SHELL_WINS_VAR=from_env',
        },
        async (rootDir) => {
          await repoWithPlugin(rootDir, ['.env.commons', '.env']);

          expect(process.env.DOTENV_SHELL_WINS_VAR).toBe('from_shell');
        },
      );

      if (originalValue === undefined) {
        delete process.env.DOTENV_SHELL_WINS_VAR;
      } else {
        process.env.DOTENV_SHELL_WINS_VAR = originalValue;
      }
    });

    test('it loads .env before the project env block is expanded', async () => {
      // Regression: previously .env was loaded in the plugin's async init(),
      // which ran AFTER Monorepo.installEnv() expanded the env block. The
      // expansion would fall back to the default and write that into
      // process.env; dotenv then refused to overwrite it, silently dropping
      // the .env value.
      const originalValue = process.env.DOTENV_PRECEDENCE_VAR;
      delete process.env.DOTENV_PRECEDENCE_VAR;

      await withAProjectLookingLike(
        {
          '.env': 'DOTENV_PRECEDENCE_VAR=from_dotenv',
        },
        async (rootDir) => {
          await repoWithPlugin(rootDir, ['.env'], {
            // eslint-disable-next-line no-template-curly-in-string
            DOTENV_PRECEDENCE_VAR: '${env:DOTENV_PRECEDENCE_VAR:-fallback}',
          });

          expect(process.env.DOTENV_PRECEDENCE_VAR).toBe('from_dotenv');
        },
      );

      if (originalValue === undefined) {
        delete process.env.DOTENV_PRECEDENCE_VAR;
      } else {
        process.env.DOTENV_PRECEDENCE_VAR = originalValue;
      }
    });
  });
});
