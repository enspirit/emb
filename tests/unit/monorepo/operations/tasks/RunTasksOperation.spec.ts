import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  ExecutorType,
  RunTasksOperation,
  TaskWithScript,
  TaskWithScriptAndComponent,
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

  describe('#runLocal()', () => {
    test('it pipes local task output into the provided writable', async () => {
      const operation = new RunTasksOperation();

      const chunks: Array<Buffer> = [];
      const collector = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(Buffer.from(chunk));
          callback();
        },
      });

      // runLocal is protected; forwarding the tee/log Writable to the local
      // exec operation is the whole point of finding #47. Without it, output
      // goes straight to process.stdout and the collector stays empty.
      await (
        operation as unknown as {
          runLocal: (task: unknown, out: Writable) => Promise<unknown>;
        }
      ).runLocal(
        { id: 'echo', name: 'echo', script: 'echo tee-capture-marker' },
        collector,
      );

      const output = Buffer.concat(chunks).toString('utf8');
      expect(output).toContain('tee-capture-marker');
    });
  });

  describe('task dependencies', () => {
    let depSetup: TestSetup;

    const withEmbfile = async (
      tasks: Record<string, unknown>,
      components: Record<string, Record<string, unknown>>,
    ) => {
      depSetup = await createTestSetup({
        tempDirPrefix: 'embRunTasksPreTest',
        embfile: {
          project: { name: 'test-tasks' },
          plugins: [],
          tasks,
          components: Object.fromEntries(
            Object.entries(components).map(([name, cmpTasks]) => [
              name,
              { tasks: cmpTasks },
            ]),
          ),
        } as never,
      });
      await Promise.all(
        Object.keys(components).map((name) =>
          mkdir(join(depSetup.tempDir, name), { recursive: true }),
        ),
      );
    };

    // Records which executor ran each task instead of running it
    class RecordingRunTasksOperation extends RunTasksOperation {
      executed: Array<[string, ExecutorType]> = [];

      protected override async runDocker(task: TaskWithScriptAndComponent) {
        this.executed.push([task.id, ExecutorType.container]);
        return undefined as never;
      }

      protected override async runKubernetes(task: TaskWithScriptAndComponent) {
        this.executed.push([task.id, ExecutorType.kubernetes]);
        return undefined as never;
      }

      protected override async runLocal(task: TaskWithScript) {
        this.executed.push([task.id, ExecutorType.local]);
        return undefined as never;
      }
    }

    afterEach(async () => {
      await depSetup?.cleanup();
    });

    test('a short pre reference targets the task of the same component', async () => {
      await withEmbfile(
        {},
        {
          api: {
            setup: { script: 'echo api-setup' },
            test: { script: 'echo api-test', pre: ['setup'] },
          },
          web: {
            setup: { script: 'echo web-setup' },
            test: { script: 'echo web-test', pre: ['setup'] },
          },
        },
      );

      const result = await new RunTasksOperation().run({
        tasks: ['api:test'],
        executor: ExecutorType.local,
      });

      expect(result.map((t) => t.id)).toEqual(['api:setup', 'api:test']);
    });

    test('--all-matching does not leak into pre references', async () => {
      await withEmbfile(
        {},
        {
          api: {
            setup: { script: 'echo api-setup' },
            test: { script: 'echo api-test', pre: ['setup'] },
          },
          web: {
            setup: { script: 'echo web-setup' },
          },
        },
      );

      const result = await new RunTasksOperation().run({
        tasks: ['api:test'],
        executor: ExecutorType.local,
        allMatching: true,
      });

      expect(result.map((t) => t.id)).toEqual(['api:setup', 'api:test']);
    });

    test('a short pre reference falls back to a monorepo-wide lookup', async () => {
      await withEmbfile(
        { lint: { script: 'echo global-lint' } },
        {
          api: {
            test: { script: 'echo api-test', pre: ['lint'] },
          },
        },
      );

      const result = await new RunTasksOperation().run({
        tasks: ['api:test'],
        executor: ExecutorType.local,
      });

      expect(result.map((t) => t.id)).toEqual(['lint', 'api:test']);
    });

    test('a task referencing its own name targets the global task', async () => {
      await withEmbfile(
        { lint: { script: 'echo global-lint' } },
        {
          api: {
            lint: { script: 'echo api-lint', pre: ['lint'] },
          },
        },
      );

      const result = await new RunTasksOperation().run({
        tasks: ['api:lint'],
        executor: ExecutorType.local,
      });

      expect(result.map((t) => t.id)).toEqual(['lint', 'api:lint']);
    });

    test('an ambiguous pre reference is reported with its owner', async () => {
      await withEmbfile(
        { deploy: { script: 'echo deploy', pre: ['setup'] } },
        {
          api: { setup: { script: 'echo api-setup' } },
          web: { setup: { script: 'echo web-setup' } },
        },
      );

      await expect(
        new RunTasksOperation().run({
          tasks: ['deploy'],
          executor: ExecutorType.local,
        }),
      ).rejects.toThrow(/`deploy` depends on ambiguous reference `setup`/);
    });

    test('broken pre references in unrelated tasks are ignored', async () => {
      await withEmbfile(
        {
          deploy: { script: 'echo deploy' },
          broken: { script: 'echo broken', pre: ['nope'] },
          ambiguous: { script: 'echo ambiguous', pre: ['setup'] },
        },
        {
          api: { setup: { script: 'echo api-setup' } },
          web: { setup: { script: 'echo web-setup' } },
        },
      );

      const result = await new RunTasksOperation().run({
        tasks: ['deploy'],
        executor: ExecutorType.local,
      });

      expect(result.map((t) => t.id)).toEqual(['deploy']);
    });

    test('--executor only applies to the requested tasks', async () => {
      await withEmbfile(
        { lint: { script: 'echo lint' } },
        {
          api: {
            setup: { script: 'echo setup', executors: ['local'] },
            test: {
              script: 'echo test',
              pre: ['setup', 'lint'],
              executors: ['local', 'container'],
            },
          },
        },
      );

      const operation = new RecordingRunTasksOperation();
      await operation.run({
        tasks: ['api:test'],
        executor: ExecutorType.container,
      });

      expect(operation.executed).toEqual([
        ['api:setup', ExecutorType.local],
        ['lint', ExecutorType.local],
        ['api:test', ExecutorType.container],
      ]);
    });

    test('--executor applies to a requested task that is also a prerequisite', async () => {
      await withEmbfile(
        {},
        {
          api: {
            setup: { script: 'echo setup', executors: ['local', 'container'] },
            test: {
              script: 'echo test',
              pre: ['setup'],
              executors: ['local', 'container'],
            },
          },
        },
      );

      const operation = new RecordingRunTasksOperation();
      await operation.run({
        tasks: ['api:setup', 'api:test'],
        executor: ExecutorType.container,
      });

      expect(operation.executed).toEqual([
        ['api:setup', ExecutorType.container],
        ['api:test', ExecutorType.container],
      ]);
    });
  });
});
