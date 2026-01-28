import { Args } from '@oclif/core';

import { BaseCommand, getContext } from '@/cli';
import { ComposeStartOperation } from '@/docker/index.js';

export default class StartCommand extends BaseCommand {
  static description = 'Starts the whole project.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};
  static args = {
    service: Args.string({
      name: 'service',
      description: 'The service(s) to start',
    }),
  };
  static strict = false;

  public async run(): Promise<void> {
    const { argv } = await this.parse(StartCommand);
    const { monorepo, compose } = getContext();

    let services: string[] | undefined;

    if (argv.length > 0) {
      services = await compose.validateServices(argv as string[]);
    }

    await monorepo.run(new ComposeStartOperation(), {
      services,
    });
  }
}
