import { Args } from '@oclif/core';

import { FlavoredCommand, getContext } from '@/cli';
import { BuildComponentsOperation } from '@/monorepo';

export default class BuildCommand extends FlavoredCommand<typeof BuildCommand> {
  static args = {
    component: Args.string({
      description: 'List of components to build (defaults to all)',
      required: false,
    }),
  };
  static description = 'Build the components of the monorepo';
  static examples = [
    `<%= config.bin %> <%= command.id %> build --flavor development`,
  ];
  static flags = {};
  static strict = false;

  async run(): Promise<void> {
    const { argv } = await this.parse(BuildCommand);
    const { monorepo } = getContext();

    await monorepo.run(new BuildComponentsOperation(), {
      components:
        argv.length > 0
          ? (argv as string[])
          : monorepo.components.map((c) => c.name),
    });
  }
}
