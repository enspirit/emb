import { Args, Flags } from '@oclif/core';

import { BaseCommand, getContext } from '@/cli';
import { ComposeLogsOperation } from '@/docker';

export default class ComponentsLogs extends BaseCommand {
  static aliases: string[] = ['logs'];
  static description = 'Get components logs.';
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
    component: Args.string({
      name: 'component',
      description:
        'The component(s) you want to see the logs of (all if omitted)',
      required: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags, argv } = await this.parse(ComponentsLogs);
    const { monorepo } = await getContext();

    const componentNames = argv as string[];

    // Validate that all specified components exist
    const services = componentNames.map((name) => {
      const component = monorepo.component(name);
      return component.name;
    });

    await monorepo.run(new ComposeLogsOperation(), {
      services: services.length > 0 ? services : undefined,
      follow: flags.follow,
    });
  }
}
