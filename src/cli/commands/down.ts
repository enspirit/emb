import { Args } from '@oclif/core';

import { FlavoredCommand, getContext } from '@/cli';
import { ComposeDownOperation } from '@/docker';

export default class DownCommand extends FlavoredCommand<typeof DownCommand> {
  static description = 'Stop the whole project.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};
  static args = {
    service: Args.string({
      name: 'service',
      description: 'The service(s) to stop and remove',
    }),
  };
  static strict = false;

  public async run(): Promise<void> {
    const { argv } = await this.parse(DownCommand);
    const { monorepo, compose } = getContext();

    let services: string[] | undefined;

    if (argv.length > 0) {
      services = await compose.validateServices(argv as string[]);
    }

    await monorepo.run(new ComposeDownOperation(), {
      services,
    });
  }
}
