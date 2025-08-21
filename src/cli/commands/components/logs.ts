import { Args, Flags } from '@oclif/core';

import { BaseCommand, getContext } from '@/cli';

export default class ComponentsLogs extends BaseCommand {
  static aliases: string[] = ['logs'];
  static description = 'Get components logs.';
  static enableJsonFlag = false;
  static examples = ['<%= config.bin %> <%= command.id %>'];
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
      description: 'The component you want to see the logs of',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags, args } = await this.parse(ComponentsLogs);
    const { monorepo, docker, compose } = await getContext();

    const component = monorepo.component(args.component);
    const containerId = await compose.getContainer(component.name, {
      mustBeRunning: false,
    });
    const container = await docker.getContainer(containerId);

    if (flags.follow) {
      const stream = await container.logs({
        follow: true,
        stderr: true,
        stdout: true,
      });

      docker.modem.demuxStream(stream, process.stdout, process.stderr);
    } else {
      const res = await container.logs({
        stderr: true,
        stdout: true,
      });

      this.log(res.toString());
    }
  }
}
