import { Args, Command } from '@oclif/core';
import { delay, Listr, ListrTask } from 'listr2';

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
  static flags = {};
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

        async task(_ctx, listrTask) {
          const logStream = await monorepo.store.createWriteStream(
            `logs/tasks/run/${task.id}.log`,
          );

          const cwd = task.component
            ? monorepo.component(task.component).rootdir
            : monorepo.rootDir;

          const process = await shellExecutor.run(task.script, {
            cwd,
          });

          process.stdout?.pipe?.(listrTask.stdout());
          process.stderr?.pipe?.(listrTask.stdout());

          process.stdout?.pipe?.(logStream);
          process.stderr?.pipe?.(logStream);
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

    try {
      await runner.run();
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
