import { Flags } from '@oclif/core';

import { FlavoredCommand, getContext } from '@/cli';
import { ComposePsOperation } from '@/docker/index.js';

export default class PsCommand extends FlavoredCommand<typeof PsCommand> {
  static description = 'Lists the containers running in the project.';
  static enableJsonFlag = false;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    all: Flags.boolean({
      char: 'a',
      default: false,
      description: 'Show all stopped containers',
      name: 'all',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(PsCommand);
    const { monorepo } = getContext();

    await monorepo.run(new ComposePsOperation(), {
      all: flags.all,
    });
  }
}
