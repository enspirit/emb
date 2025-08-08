import { Command } from '@oclif/core';
import { printTable } from '@oclif/table';

import { TaskInfo } from '../../../monorepo/types.js';
import { TABLE_DEFAULTS } from '../../constant.js';
import { getContext } from '../../context.js';

export default class TasksIndex extends Command {
  static description = 'List tasks.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};

  public async run(): Promise<Array<TaskInfo>> {
    const { flags } = await this.parse(TasksIndex);
    const context = await getContext();
    const { monorepo } = context;
    const { tasks } = monorepo;

    if (!flags.json)
      printTable({
        ...TABLE_DEFAULTS,
        columns: ['id', 'component', 'name', 'description'],
        data: tasks,
      });

    return tasks;
  }
}
