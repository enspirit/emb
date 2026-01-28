import { Args, Flags } from '@oclif/core';

import { BaseCommand, getContext } from '@/cli';
import { ComposeRestartOperation } from '@/docker/index.js';

export default class RestartComand extends BaseCommand {
  static description = 'Restart the whole project.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    'no-deps': Flags.boolean({
      char: 'f',
      default: false,
      description: "Don't restart dependent services",
      name: 'no-deps',
    }),
  };
  static args = {
    service: Args.string({
      name: 'service',
      description: 'The service(s) to restart',
    }),
  };
  static strict = false;

  public async run(): Promise<void> {
    const { flags, argv } = await this.parse(RestartComand);
    const { monorepo, compose } = getContext();

    let services: string[] | undefined;

    if (argv.length > 0) {
      services = await compose.validateServices(argv as string[]);
    }

    await monorepo.run(new ComposeRestartOperation(), {
      noDeps: flags['no-deps'],
      services,
    });
  }
}
