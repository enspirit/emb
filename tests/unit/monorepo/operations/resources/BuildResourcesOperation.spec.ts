import { DockerComposeClient, setContext } from '@';
import Dockerode from 'dockerode';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createKubernetesClient } from '@/kubernetes/client.js';
import { Monorepo } from '@/monorepo';

import { BuildResourcesOperation } from '../../../../../src/monorepo/operations/resources/BuildResourcesOperation.js';

const setMonorepoContext = (repo: Monorepo): void => {
  const compose = new DockerComposeClient(repo);
  setContext({
    docker: vi.mockObject(new Dockerode()),
    kubernetes: vi.mockObject(createKubernetesClient()),
    monorepo: repo,
    compose,
  });
};

describe('Monorepo / Operations / Resources / BuildResourcesOperation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embBuildResourcesTest'));
    await mkdir(join(tempDir, 'api'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const createMonorepoWithFileResources = async (): Promise<Monorepo> => {
    const repo = new Monorepo(
      {
        project: {
          name: 'test-build',
        },
        plugins: [],
        components: {
          api: {
            resources: {
              testfile: {
                type: 'file',
                params: {
                  path: 'output.txt',
                },
              },
            },
          },
        },
      },
      tempDir,
    );

    await repo.init();
    setMonorepoContext(repo);
    return repo;
  };

  describe('#run()', () => {
    test('it builds a file resource and creates the file', async () => {
      const repo = await createMonorepoWithFileResources();

      const result = await repo.run(new BuildResourcesOperation(), {
        resources: ['testfile'],
        silent: true,
      });

      expect(result['api:testfile']).toBeDefined();
      expect(result['api:testfile'].resource?.id).toBe('api:testfile');

      // Verify file was created
      const fileStat = await stat(join(tempDir, 'api', 'output.txt'));
      expect(fileStat.isFile()).toBe(true);
    });

    test('it supports dry run mode without creating file', async () => {
      const repo = await createMonorepoWithFileResources();

      const result = await repo.run(new BuildResourcesOperation(), {
        resources: ['testfile'],
        dryRun: true,
        silent: true,
      });

      expect(result['api:testfile']).toBeDefined();
      expect(result['api:testfile'].dryRun).toBe(true);
    });

    test('it detects cache hit when file exists', async () => {
      const repo = await createMonorepoWithFileResources();

      // Create the file first
      await writeFile(join(tempDir, 'api', 'output.txt'), 'existing');

      const result = await repo.run(new BuildResourcesOperation(), {
        resources: ['testfile'],
        silent: true,
      });

      expect(result['api:testfile']).toBeDefined();
      expect(result['api:testfile'].cacheHit).toBe(true);
    });

    test('it forces rebuild when force option is set', async () => {
      const repo = await createMonorepoWithFileResources();

      // Create the file first
      await writeFile(join(tempDir, 'api', 'output.txt'), 'existing');

      const result = await repo.run(new BuildResourcesOperation(), {
        resources: ['testfile'],
        force: true,
        silent: true,
      });

      expect(result['api:testfile']).toBeDefined();
      expect(result['api:testfile'].force).toBe(true);
    });

    test('it builds multiple resources', async () => {
      await mkdir(join(tempDir, 'frontend'), { recursive: true });

      const repo = new Monorepo(
        {
          project: {
            name: 'test-build',
          },
          plugins: [],
          components: {
            api: {
              resources: {
                file1: {
                  type: 'file',
                  params: { path: 'file1.txt' },
                },
              },
            },
            frontend: {
              resources: {
                file2: {
                  type: 'file',
                  params: { path: 'file2.txt' },
                },
              },
            },
          },
        },
        tempDir,
      );
      await repo.init();
      setMonorepoContext(repo);

      const result = await repo.run(new BuildResourcesOperation(), {
        resources: ['file1', 'file2'],
        silent: true,
      });

      expect(Object.keys(result).length).toBe(2);
      expect(result['api:file1']).toBeDefined();
      expect(result['frontend:file2']).toBeDefined();
    });

    test('it respects resource dependencies ordering', async () => {
      const repo = new Monorepo(
        {
          project: {
            name: 'test-build',
          },
          plugins: [],
          components: {
            api: {
              resources: {
                base: {
                  type: 'file',
                  params: { path: 'base.txt' },
                },
                dependent: {
                  type: 'file',
                  params: { path: 'dependent.txt' },
                  dependencies: ['api:base'],
                },
              },
            },
          },
        },
        tempDir,
      );
      await repo.init();
      setMonorepoContext(repo);

      const result = await repo.run(new BuildResourcesOperation(), {
        resources: ['dependent'],
        silent: true,
      });

      // Both base and dependent should be built
      expect(result['api:base']).toBeDefined();
      expect(result['api:dependent']).toBeDefined();
    });
  });
});
