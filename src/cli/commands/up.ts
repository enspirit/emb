import { Flags } from '@oclif/core';
import { Listr } from 'listr2';

import { FlavoredCommand, getContext } from '@/cli';
import { ComposeUpOperation } from '@/docker';

export default class UpCommand extends FlavoredCommand<typeof UpCommand> {
  static description = 'Start the whole project.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    'force-recreate': Flags.boolean({
      char: 'f',
      default: false,
      description:
        "Recreate containers even if their configuration and image haven't changed",
      name: 'force-recreate',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(UpCommand);
    const { monorepo } = getContext();

    const runner = new Listr([
      {
        rendererOptions: { persistentOutput: true },
        async task() {
          return monorepo.run(new ComposeUpOperation(), {
            forceRecreate: flags['force-recreate'],
          });
        },
        title: 'Starting project',
      },
    ]);

    await runner.run();
  }
}
