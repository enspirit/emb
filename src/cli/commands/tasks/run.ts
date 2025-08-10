import { AmbiguousTaskError, getContext } from '@';
import { Args, Command, Flags } from '@oclif/core';

import { ExecutorType, RunTasksOperation } from '@/monorepo';

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
    'all-matching': Flags.boolean({
      name: 'all-matching',
      char: 'a',
      description: 'Run all tasks matching (when multiple matches)',
      default: false,
    }),
  };
  static strict = false;

  public async run(): Promise<void> {
    const { argv, flags } = await this.parse(RunTask);
    const { monorepo } = await getContext();

    try {
      await monorepo.run(new RunTasksOperation(), {
        tasks: argv as Array<string>,
        executor: flags.executor as ExecutorType,
        allMatching: flags['all-matching'],
      });
    } catch (error) {
      if (error instanceof AmbiguousTaskError) {
        throw error.toCliError([
          `Specify just one. Eg: \`emb tasks run ${error.options[0]}\``,
          'Run the same command with --all-matches / -a',
          'Review the list of tasks by running `emb tasks`',
        ]);
      }
    }
  }
}
