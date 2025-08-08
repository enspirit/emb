import { Args, Command, Flags } from '@oclif/core';
import { Listr, ListrTask } from 'listr2';
import { PassThrough, Writable } from 'node:stream';

import { getContainer, listContainers } from '../../../docker/index.js';
import { dockerExecutor } from '../../../executors/docker.js';
import { ExecutorType } from '../../../executors/index.js';
import { shellExecutor } from '../../../executors/shell.js';
import { TaskInfo } from '../../../monorepo/types.js';
import { getContext } from '../../context.js';

export default class RunTask extends Command {
  static args = {
    task: Args.string({
      description: 'List of tasks ids to run (eg: component:task)',
      required: false,
    }),
  };
  static description = 'Run a task.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    executor: Flags.string({
      char: 'x',
      name: 'executor',
      options: Object.keys(ExecutorType),
    }),
  };
  static strict = false;

  public async run(): Promise<void> {
    const { argv, flags } = await this.parse(RunTask);
    const context = await getContext();
    const { monorepo } = context;

    const toRun =
      argv.length > 0
        ? argv.reduce<Array<TaskInfo>>((tasks, t) => {
            const found = monorepo.tasks.filter((task) => task.id === t);

            if (found.length === 0) {
              throw new Error(`Task ${t} not found`);
            }

            return [...tasks, ...found];
          }, [])
        : monorepo.tasks;

    const runTasks: Array<ListrTask> = toRun.map((task) => {
      return {
        rendererOptions: { persistentOutput: true },

        task: async (_ctx, listrTask) => {
          const type: ExecutorType = flags.executor
            ? (flags.executor as ExecutorType)
            : ExecutorType.container;

          const logStream: Writable = await monorepo.store.createWriteStream(
            `logs/tasks/run/${task.id}.log`,
          );

          // Gonna log on both the logStream and stdout
          const tee = new PassThrough();
          tee.pipe(listrTask.stdout());
          tee.pipe(logStream);

          switch (type) {
            case ExecutorType.container: {
              return this.dockerExec(task, tee);
            }

            case ExecutorType.local: {
              return this.shellExec(task, tee);
            }

            default: {
              throw new Error(`Unsupported executor: ${type}`);
            }
          }
        },
        title: `Running ${task.id}`,
      };
    });

    const runner = new Listr([
      {
        rendererOptions: { persistentOutput: true },
        async task(ctx, task) {
          return task.newListr(runTasks, {
            exitOnError: true,
            rendererOptions: { collapseSubtasks: false },
          });
        },
        title: 'Running tasks',
      },
    ]);

    await runner.run();
  }

  private async dockerExec(task: TaskInfo, out: Writable) {
    const { monorepo } = getContext();

    const matching = await listContainers({
      filters: {
        label: [
          `emb/project=${monorepo.name}`,
          `emb/component=${task.component}`,
        ],
      },
    });

    if (matching.length === 0) {
      throw new Error(
        `Could not find a running container for '${task.component}'`,
      );
    }

    if (matching.length > 1) {
      throw new Error(
        `More than one running container found for '${task.component}'`,
      );
    }

    const container = await getContainer(matching[0].Id);

    return dockerExecutor.run(task.script, {
      container,
      out,
    });
  }

  private async shellExec(task: TaskInfo, out: Writable) {
    const { monorepo } = getContext();

    const cwd = task.component
      ? monorepo.component(task.component).rootdir
      : monorepo.rootDir;

    return shellExecutor.run(task.script, {
      cwd,
      out,
    });
  }
}
