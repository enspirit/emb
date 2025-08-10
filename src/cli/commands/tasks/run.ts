import { getContext } from '@';
import { Args, Command, Flags } from '@oclif/core';

import {
  ExecutorType,
  RunTasksOperation,
} from '@/monorepo/operations/tasks/RunTasksOperation.js';

export default class RunTask extends Command {
  static args = {
    task: Args.string({
      description:
        'List of tasks to run. You can provide either ids or names (eg: component:task or task)',
      required: true,
    }),
  };
  static description = 'Run tasks.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    executor: Flags.string({
      name: 'executor',
      char: 'x',
      description: 'Where to run the task. (experimental!)',
      options: Object.values(ExecutorType),
    }),
  };
  static strict = false;

  public async run(): Promise<void> {
    const { argv, flags } = await this.parse(RunTask);
    const { monorepo } = await getContext();

    await monorepo.run(new RunTasksOperation(), {
      tasks: argv as Array<string>,
      executor: flags.executor as ExecutorType,
    });
  }
}
