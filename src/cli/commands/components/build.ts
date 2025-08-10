import { Args, Flags } from '@oclif/core';

import { FlavoredCommand, getContext } from '@/cli';
import { BuildComponentMeta, BuildComponentsOperation } from '@/monorepo';

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
  static flags = {
    'dry-run': Flags.boolean({
      required: false,
      description:
        'Do not build the components but only produce build meta information',
    }),
  };
  static enableJsonFlag = true;
  static strict = false;

  async run(): Promise<Record<string, BuildComponentMeta>> {
    const { argv, flags } = await this.parse(BuildCommand);
    const { monorepo } = getContext();

    return monorepo.run(new BuildComponentsOperation(), {
      dryRun: flags['dry-run'],
      components:
        argv.length > 0
          ? (argv as string[])
          : monorepo.components.map((c) => c.name),
    });
  }
}
