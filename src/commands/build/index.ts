import { Command, Flags } from '@oclif/core';

import { build } from '../../monorepo/index.js';

export default class Build extends Command {
  static args = {};
  static description = 'Build the docker images of the monorepo';
  static examples = [
    `<%= config.bin %> <%= command.id %> build --flavour development`,
  ];
  static flags = {
    concurrency: Flags.integer({
      char: 'c',
      default: 3,
      description: 'Number of concurrent builds',
      required: false,
    }),
    flavour: Flags.string({
      char: 'f',
      description: 'Flavour to build (dev, production, ...)',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Build);

    build({ concurreny: flags.concurrency });
  }
}
