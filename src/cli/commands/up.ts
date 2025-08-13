import { Flags } from '@oclif/core';

import { FlavoredCommand, getContext } from '@/cli';
import { ComposeUpOperation } from '@/docker/index.js';

export default class UpCommand extends FlavoredCommand<typeof UpCommand> {
  static description = 'Start the whole project.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    force: Flags.boolean({
      char: 'f',
      default: false,
      description: 'Bypass caches, force the recreation of containers, etc',
      name: 'force',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(UpCommand);
    const { monorepo } = getContext();

    const buildFlags = [];
    if (flags.force) {
      buildFlags.push('--force');
    }

    if (flags.flavor) {
      buildFlags.push('--flavor', flags.flavor);
    }

    await this.config.runCommand('resources:build', buildFlags);

    await monorepo.run(new ComposeUpOperation(), {
      forceRecreate: flags.force,
    });
  }
}
