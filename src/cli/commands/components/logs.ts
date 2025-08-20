import { Args, Flags } from '@oclif/core';

import { BaseCommand, getContext } from '@/cli';
import { ListContainersOperation } from '@/docker/index.js';

export default class ComponentsLogs extends BaseCommand {
  static aliases: string[] = ['logs'];
  static description = 'Get components logs.';
  static enableJsonFlag = false;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    follow: Flags.boolean({
      name: 'follow',
      char: 'f',
      description: 'Follow log output',
      default: false,
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
    const { monorepo, docker } = await getContext();

    const component = monorepo.component(args.component);

    const containers = await monorepo.run(new ListContainersOperation(), {
      all: true,
      filters: {
        label: [
          `emb/project=${monorepo.name}`,
          `emb/component=${component.name}`,
        ],
      },
    });

    if (containers.length === 0) {
      return this.error(
        `No container found for component \`${component.name}\``,
      );
    }

    if (containers.length > 1) {
      return this.error(
        `More than one container found for component \`${component.name}\``,
      );
    }

    const container = await docker.getContainer(containers[0].Id);

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
