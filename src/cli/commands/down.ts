import { Args, Flags } from '@oclif/core';

import { FlavoredCommand, getContext } from '@/cli';
import { ComposeDownOperation } from '@/docker';

export default class DownCommand extends FlavoredCommand<typeof DownCommand> {
  static description = 'Stop the whole project.';
  static enableJsonFlag = true;
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --volumes --remove-orphans',
  ];
  static flags = {
    volumes: Flags.boolean({
      char: 'v',
      default: false,
      description:
        'Remove named volumes declared in the compose file and anonymous volumes attached to containers',
      name: 'volumes',
    }),
    'remove-orphans': Flags.boolean({
      default: false,
      description:
        'Remove containers for services not defined in the compose file',
      name: 'remove-orphans',
    }),
  };
  static args = {
    service: Args.string({
      name: 'service',
      description: 'The service(s) to stop and remove',
    }),
  };
  static strict = false;

  public async run(): Promise<void> {
    const { argv, flags } = await this.parse(DownCommand);
    const { monorepo, compose } = getContext();

    let services: string[] | undefined;

    if (argv.length > 0) {
      services = await compose.validateServices(argv as string[]);
    }

    await monorepo.run(new ComposeDownOperation(), {
      services,
      volumes: flags.volumes,
      removeOrphans: flags['remove-orphans'],
    });
  }
}
