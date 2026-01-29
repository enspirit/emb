import { Args, Flags } from '@oclif/core';

import { BaseCommand, getContext } from '@/cli';
import { ComposeLogsOperation } from '@/docker';

export default class Logs extends BaseCommand {
  static description = 'Get service logs.';
  static enableJsonFlag = false;
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> backend',
    '<%= config.bin %> <%= command.id %> backend frontend',
    '<%= config.bin %> <%= command.id %> --no-follow backend',
  ];
  static strict = false;
  static flags = {
    follow: Flags.boolean({
      name: 'follow',
      char: 'f',
      allowNo: true,
      description: 'Follow log output',
      default: true,
    }),
  };
  static args = {
    service: Args.string({
      name: 'service',
      description:
        'The service(s) you want to see the logs of (all if omitted)',
      required: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags, argv } = await this.parse(Logs);
    const { monorepo, compose } = getContext();

    const serviceNames = argv as string[];

    // Validate that all specified services exist in docker-compose.yml
    let services: string[] | undefined;
    if (serviceNames.length > 0) {
      services = await compose.validateServices(serviceNames);
    }

    await monorepo.run(new ComposeLogsOperation(), {
      services,
      follow: flags.follow,
    });
  }
}
