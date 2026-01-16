import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  ExecutorType,
  RunTasksOperation,
} from '../../../../../src/monorepo/operations/tasks/RunTasksOperation.js';

describe('Monorepo / Operations / Tasks / RunTasksOperation', () => {
  let setup: TestSetup;

  beforeEach(async () => {
    setup = await createTestSetup({
      tempDirPrefix: 'embRunTasksTest',
      embfile: {
        project: { name: 'test-tasks' },
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
    });
    await mkdir(join(setup.tempDir, 'api'), { recursive: true });
  });

  afterEach(async () => {
    await setup.cleanup();
  });

  describe('ExecutorType', () => {
    test('it has container and local types', () => {
      expect(ExecutorType.container).toBe('container');
      expect(ExecutorType.local).toBe('local');
    });
  });

  describe('#run()', () => {
    test('it runs a local task and returns task info', async () => {
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
      const depSetup = await createTestSetup({
        tempDirPrefix: 'embRunTasksDepsTest',
        embfile: {
          project: { name: 'test-tasks' },
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
      });

      await mkdir(join(depSetup.tempDir, 'api'), { recursive: true });

      try {
        const operation = new RunTasksOperation();
        const result = await operation.run({
          tasks: ['build'],
          executor: ExecutorType.local,
        });

        // Both setup and build should be run, with setup first
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('api:setup');
        expect(result[1].id).toBe('api:build');
      } finally {
        await depSetup.cleanup();
      }
    });

    test('it uses task ID for full reference', async () => {
      const operation = new RunTasksOperation();
      const result = await operation.run({
        tasks: ['api:build'],
        executor: ExecutorType.local,
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('api:build');
    });

    test('it handles tasks with environment variables', async () => {
      const envSetup = await createTestSetup({
        tempDirPrefix: 'embRunTasksEnvTest',
        embfile: {
          project: { name: 'test-tasks' },
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
      });

      await mkdir(join(envSetup.tempDir, 'api'), { recursive: true });

      try {
        const operation = new RunTasksOperation();
        const result = await operation.run({
          tasks: ['greet'],
          executor: ExecutorType.local,
        });

        expect(result).toHaveLength(1);
        expect(result[0].vars).toEqual({ NAME: 'World' });
      } finally {
        await envSetup.cleanup();
      }
    });

    test('it runs tasks across multiple components', async () => {
      const multiSetup = await createTestSetup({
        tempDirPrefix: 'embRunTasksMultiTest',
        embfile: {
          project: { name: 'test-tasks' },
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
      });

      await mkdir(join(multiSetup.tempDir, 'api'), { recursive: true });
      await mkdir(join(multiSetup.tempDir, 'frontend'), { recursive: true });

      try {
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
      } finally {
        await multiSetup.cleanup();
      }
    });
  });
});
