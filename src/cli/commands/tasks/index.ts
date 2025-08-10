import { getContext } from '@';
import { Command } from '@oclif/core';
import { printTable } from '@oclif/table';

import { TABLE_DEFAULTS } from '@/cli';
import { TaskInfo } from '@/monorepo';

export default class TasksIndex extends Command {
  static description = 'List tasks.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};

  public async run(): Promise<Array<TaskInfo>> {
    const { flags } = await this.parse(TasksIndex);
    const {
      monorepo: { tasks },
    } = await getContext();

    if (!flags.json)
      printTable({
        ...TABLE_DEFAULTS,
        columns: ['name', 'component', 'description', 'id'],
        data: tasks.toSorted((a, b) => {
          if (a.component === b.component) {
            return a.name < b.name ? -1 : 1;
          }

          if (!a.component && b.component) {
            return -1;
          }

          return 0;
        }),
      });

    return tasks;
  }
}
