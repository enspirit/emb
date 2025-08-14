import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { rimraf } from 'rimraf';
import { beforeAll, describe, expect, test } from 'vitest';

import {
  AutoDockerPlugin,
  AutoDockerPluginOptions,
  Monorepo,
} from '@/monorepo';

const withAProjectLookingLike = async (
  dockerfiles: Array<string>,
  callback: (rootDir: string) => Promise<void>,
) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'embTmp'));
  await Promise.all(
    dockerfiles.map(async (path) => {
      await mkdir(join(rootDir, dirname(path)), { recursive: true });
      await writeFile(join(rootDir, path), 'FROM nginx\n');
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
  config: AutoDockerPluginOptions,
): Promise<Monorepo> => {
  const repo = new Monorepo(
    {
      project: {
        name: 'test',
      },
      plugins: [
        {
          name: AutoDockerPlugin.name,
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

describe('Plugins / AutoDocker', () => {
  beforeAll(async () => {});

  test('it works as expected with default config on an empty project tree', async () => {
    await withAProjectLookingLike([], async (rootDir) => {
      const repo = await repoWithPlugin(rootDir, {});

      expect(repo.components).toHaveLength(0);
    });
  });

  test('it works as expected with default config on a non empty project tree', async () => {
    await withAProjectLookingLike(
      ['frontend/Dockerfile', 'api/Dockerfile'],
      async (rootDir) => {
        const repo = await repoWithPlugin(rootDir, {});

        expect(repo.components).toHaveLength(2);
        expect(repo.components).toHaveLength(2);
      },
    );
  });
});
