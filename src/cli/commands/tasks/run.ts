import { getContext } from '@';
import { Args, Command, Flags } from '@oclif/core';
import { Listr, ListrTask } from 'listr2';

import { TaskInfo } from '@/monorepo';
import {
  ExecutorType,
  RunTaskOperation,
} from '@/monorepo/operations/tasks/RunTaskOperation.js';

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
      options: Object.values(ExecutorType),
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
      const executor =
        flags.executor ||
        (task.component ? ExecutorType.container : ExecutorType.local);

      return {
        rendererOptions: { persistentOutput: true },

        async task(_ctx, listrTask) {
          await monorepo.run(new RunTaskOperation(listrTask.stdout()), {
            executor,
            task,
          });
        },
        title: `Running ${task.id} (${executor})`,
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
}
