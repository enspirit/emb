import { Args, Command, Flags } from '@oclif/core';

import { ImageBuilder } from '@/docker';

import { getContext } from '../../context.js';

export default class Build extends Command {
  static args = {
    component: Args.string({
      description: 'List of components to build',
      required: false,
    }),
  };
  static description = 'Build the docker images of the monorepo';
  static examples = [
    `<%= config.bin %> <%= command.id %> build --flavor development`,
  ];
  static flags = {
    concurrency: Flags.integer({
      char: 'c',
      default: 1,
      description: 'Number of concurrent builds',
      required: false,
    }),
    failfast: Flags.boolean({
      allowNo: true,
      default: true,
      description: 'Stop on first error',
      name: 'failfast',
      required: false,
    }),
    flavor: Flags.string({
      char: 'f',
      description: 'flavor to build (dev, production, ...)',
      required: false,
    }),
    retry: Flags.integer({
      char: 'r',
      default: 1,
      description: 'Retry on build fail',
      required: false,
    }),
  };
  static strict = false;

  async run(): Promise<void> {
    const { argv, flags } = await this.parse(Build);
    const { monorepo } = getContext();

    const components =
      argv?.length > 0
        ? argv.map((c) => monorepo.component(c as string))
        : monorepo.components;

    const builder = new ImageBuilder({
      components,
      concurreny: flags.concurrency,
      failfast: flags.failfast,
      retry: flags.retry,
    });

    await builder.run();
  }
}
