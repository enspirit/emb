import { DockerComposeClient, setContext } from '@';
import Dockerode from 'dockerode';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createKubernetesClient } from '@/kubernetes/client.js';
import { Monorepo } from '@/monorepo';

import {
  ExecutorType,
  RunTasksOperation,
} from '../../../../../src/monorepo/operations/tasks/RunTasksOperation.js';

const createMockCompose = (repo: Monorepo): DockerComposeClient => {
  const compose = new DockerComposeClient(repo);
  // Mock isService to return false (no docker services)
  vi.spyOn(compose, 'isService').mockResolvedValue(false);
  return compose;
};

const setMonorepoContext = (repo: Monorepo): void => {
  const compose = createMockCompose(repo);
  setContext({
    docker: vi.mockObject(new Dockerode()),
    kubernetes: vi.mockObject(createKubernetesClient()),
    monorepo: repo,
    compose,
  });
};

describe('Monorepo / Operations / Tasks / RunTasksOperation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embRunTasksTest'));
    await mkdir(join(tempDir, 'api'), { recursive: true });
    await mkdir(join(tempDir, '.emb'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const createMonorepoWithTasks = async (): Promise<Monorepo> => {
    const repo = new Monorepo(
      {
        project: {
          name: 'test-tasks',
        },
        plugins: [],
        components: {
          api: {
            tasks: {
              build: {
                script: 'echo "building api"',
              },
              test: {
                script: 'echo "testing api"',
              },
            },
          },
        },
      },
      tempDir,
    );

    await repo.init();
    return repo;
  };

  describe('ExecutorType', () => {
    test('it has container and local types', () => {
      expect(ExecutorType.container).toBe('container');
      expect(ExecutorType.local).toBe('local');
    });
  });

  describe('#run()', () => {
    test('it runs a local task and returns task info', async () => {
      const repo = await createMonorepoWithTasks();
      setMonorepoContext(repo);

      const operation = new RunTasksOperation();
      const result = await operation.run({
        tasks: ['build'],
        executor: ExecutorType.local,
      });

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('api:build');
      expect(result[0].script).toBe('echo "building api"');
    });

    test('it runs multiple tasks in order', async () => {
      const repo = await createMonorepoWithTasks();
      setMonorepoContext(repo);

      const operation = new RunTasksOperation();
      const result = await operation.run({
        tasks: ['build', 'test'],
        executor: ExecutorType.local,
      });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('api:build');
      expect(result[1].id).toBe('api:test');
    });

    test('it runs tasks with dependencies in correct order', async () => {
      const repo = new Monorepo(
        {
          project: {
            name: 'test-tasks',
          },
          plugins: [],
          components: {
            api: {
              tasks: {
                setup: {
                  script: 'echo "setup"',
                },
                build: {
                  script: 'echo "build"',
                  pre: ['api:setup'],
                },
              },
            },
          },
        },
        tempDir,
      );

      await repo.init();
      setMonorepoContext(repo);

      const operation = new RunTasksOperation();
      const result = await operation.run({
        tasks: ['build'],
        executor: ExecutorType.local,
      });

      // Both setup and build should be run, with setup first
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('api:setup');
      expect(result[1].id).toBe('api:build');
    });

    test('it uses task ID for full reference', async () => {
      const repo = await createMonorepoWithTasks();
      setMonorepoContext(repo);

      const operation = new RunTasksOperation();
      const result = await operation.run({
        tasks: ['api:build'],
        executor: ExecutorType.local,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('api:build');
    });

    test('it handles tasks with environment variables', async () => {
      const repo = new Monorepo(
        {
          project: {
            name: 'test-tasks',
          },
          plugins: [],
          components: {
            api: {
              tasks: {
                greet: {
                  script: 'echo "Hello $NAME"',
                  vars: {
                    NAME: 'World',
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

      const operation = new RunTasksOperation();
      const result = await operation.run({
        tasks: ['greet'],
        executor: ExecutorType.local,
      });

      expect(result).toHaveLength(1);
      expect(result[0].vars).toEqual({ NAME: 'World' });
    });

    test('it runs tasks across multiple components', async () => {
      await mkdir(join(tempDir, 'frontend'), { recursive: true });

      const repo = new Monorepo(
        {
          project: {
            name: 'test-tasks',
          },
          plugins: [],
          components: {
            api: {
              tasks: {
                build: {
                  script: 'echo "api build"',
                },
              },
            },
            frontend: {
              tasks: {
                build: {
                  script: 'echo "frontend build"',
                },
              },
            },
          },
        },
        tempDir,
      );

      await repo.init();
      setMonorepoContext(repo);

      const operation = new RunTasksOperation();
      const result = await operation.run({
        tasks: ['build'],
        allMatching: true,
        executor: ExecutorType.local,
      });

      // Should run both api:build and frontend:build
      expect(result).toHaveLength(2);
      const ids = result.map((t) => t.id);
      expect(ids).toContain('api:build');
      expect(ids).toContain('frontend:build');
    });
  });
});
