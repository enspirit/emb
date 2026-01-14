import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';

import { EmbfileLoaderPlugin, Monorepo } from '@/monorepo';

const withAProjectLookingLike = async (
  embfiles: Record<string, string>,
  callback: (rootDir: string) => Promise<void>,
) => {
  const rootDir = await mkdtemp(join(tmpdir(), 'embLoaderTest'));

  await Promise.all(
    Object.entries(embfiles).map(async ([path, content]) => {
      const dir = join(rootDir, path.split('/').slice(0, -1).join('/'));
      await mkdir(dir, { recursive: true });
      await writeFile(join(rootDir, path), content);
    }),
  );

  try {
    await callback(rootDir);
  } finally {
    rm(rootDir, { recursive: true, force: true });
  }
};

const repoWithPlugin = async (
  rootDir: string,
  config: Partial<{ glob: string | string[] }> = {},
): Promise<Monorepo> => {
  const repo = new Monorepo(
    {
      project: {
        name: 'test',
      },
      plugins: [
        {
          name: EmbfileLoaderPlugin.name,
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

describe('Plugins / EmbfileLoaderPlugin', () => {
  beforeAll(async () => {});

  describe('.name', () => {
    test('it has the correct static name', () => {
      expect(EmbfileLoaderPlugin.name).toBe('embfiles');
    });
  });

  describe('#extendConfig()', () => {
    test('it loads embfiles with default glob pattern', async () => {
      await withAProjectLookingLike(
        {
          'api/Embfile.yaml': `
tasks:
  build:
    script: npm run build
`,
        },
        async (rootDir) => {
          const repo = await repoWithPlugin(rootDir, {});

          expect(repo.components).toHaveLength(1);
          expect(repo.component('api')).toBeDefined();
          expect(repo.component('api').tasks.build).toBeDefined();
        },
      );
    });

    test('it loads multiple embfiles', async () => {
      await withAProjectLookingLike(
        {
          'api/Embfile.yaml': `
tasks:
  build:
    script: npm run build
`,
          'frontend/Embfile.yml': `
tasks:
  test:
    script: npm test
`,
        },
        async (rootDir) => {
          const repo = await repoWithPlugin(rootDir, {});

          expect(repo.components).toHaveLength(2);
          expect(repo.component('api')).toBeDefined();
          expect(repo.component('frontend')).toBeDefined();
        },
      );
    });

    test('it handles no embfiles found', async () => {
      await withAProjectLookingLike({}, async (rootDir) => {
        const repo = await repoWithPlugin(rootDir, {});

        expect(repo.components).toHaveLength(0);
      });
    });

    test('it works with custom glob pattern', async () => {
      await withAProjectLookingLike(
        {
          'services/api/component.yaml': `
tasks:
  deploy:
    script: kubectl apply
`,
        },
        async (rootDir) => {
          const repo = await repoWithPlugin(rootDir, {
            glob: '*/*/component.yaml',
          });

          expect(repo.components).toHaveLength(1);
          expect(repo.component('api')).toBeDefined();
        },
      );
    });

    test('it merges with existing component config', async () => {
      await withAProjectLookingLike(
        {
          'api/Embfile.yaml': `
tasks:
  build:
    script: npm run build
`,
        },
        async (rootDir) => {
          const repo = new Monorepo(
            {
              project: {
                name: 'test',
              },
              plugins: [
                {
                  name: EmbfileLoaderPlugin.name,
                  config: {},
                },
              ],
              components: {
                api: {
                  tasks: {
                    test: {
                      script: 'npm test',
                    },
                  },
                },
              },
            },
            rootDir,
          );

          await repo.init();

          // Should have both tasks - from existing config and embfile
          const apiComponent = repo.component('api');
          expect(apiComponent.tasks.test).toBeDefined();
          expect(apiComponent.tasks.build).toBeDefined();
        },
      );
    });
  });
});
