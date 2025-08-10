import { Listr } from 'listr2';

import { FlavoredCommand, getContext } from '@/cli';
import { ComposeDownOperation, ComposeUpOperation } from '@/docker';

export default class DownCommand extends FlavoredCommand<typeof DownCommand> {
  static description = 'Stop the whole project.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};

  public async run(): Promise<void> {
    const { monorepo } = getContext();

    const runner = new Listr([
      {
        rendererOptions: { persistentOutput: true },
        async task() {
          return monorepo.run(new ComposeDownOperation(), {});
        },
        title: 'Stopping project',
      },
    ]);

    await runner.run();
  }
}
