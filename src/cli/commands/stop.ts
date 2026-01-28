import { Args } from '@oclif/core';

import { FlavoredCommand, getContext } from '@/cli';
import { ComposeStopOperation } from '@/docker';

export default class StopCommand extends FlavoredCommand<typeof StopCommand> {
  static description = 'Stop the whole project.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};
  static args = {
    service: Args.string({
      name: 'service',
      description: 'The service(s) to stop',
    }),
  };
  static strict = false;

  public async run(): Promise<void> {
    const { argv } = await this.parse(StopCommand);
    const { monorepo, compose } = getContext();

    let services: string[] | undefined;

    if (argv.length > 0) {
      services = await compose.validateServices(argv as string[]);
    }

    await monorepo.run(new ComposeStopOperation(), {
      services,
    });
  }
}
