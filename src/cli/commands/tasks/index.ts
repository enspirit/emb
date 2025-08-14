import { getContext } from '@';
import { printTable } from '@oclif/table';

import { BaseCommand, TABLE_DEFAULTS } from '@/cli';
import { TaskInfo } from '@/monorepo';

export default class TasksIndex extends BaseCommand {
  static description = 'List tasks.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};

  public async run(): Promise<Array<TaskInfo>> {
    const { flags } = await this.parse(TasksIndex);
    const {
      monorepo: { tasks },
    } = await getContext();

    const sortedTasks = tasks.toSorted((a, b) => {
      const ac = a.component;
      const bc = b.component;

      // Put null/undefined first
      if (!ac && bc) {
        return -1;
      }

      if (Boolean(ac) && !bc) {
        return 1;
      }

      // Compare components (if both not null)
      if (Boolean(ac) && Boolean(bc)) {
        const cmp = ac.localeCompare(bc);
        if (cmp !== 0) {
          return cmp;
        }
      }

      // Compare names as fallback
      return a.name.localeCompare(b.name);
    });

    if (!flags.json) {
      printTable({
        ...TABLE_DEFAULTS,
        columns: ['name', 'component', 'description', 'id'],
        data: sortedTasks,
      });
    }

    return tasks;
  }
}
