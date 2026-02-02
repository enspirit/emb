import { Args, Flags } from '@oclif/core';

import { FlavoredCommand, getContext } from '@/cli';
import {
  BuildResourceMeta,
  BuildResourcesOperation,
} from '@/monorepo/operations/resources/BuildResourcesOperation.js';

export default class ResourcesBuildCommand extends FlavoredCommand<
  typeof ResourcesBuildCommand
> {
  static args = {
    component: Args.string({
      description: 'List of resources to build (defaults to all)',
      required: false,
    }),
  };
  static description = 'Build the resources of the monorepo';
  static examples = [
    `<%= config.bin %> <%= command.id %> build --flavor development`,
    `<%= config.bin %> <%= command.id %> build --publishable --flavor production`,
  ];
  static flags = {
    'dry-run': Flags.boolean({
      required: false,
      description:
        'Do not build the resources but only produce build meta information',
    }),
    force: Flags.boolean({
      name: 'force',
      char: 'f',
      required: false,
      description: 'Bypass the cache and force the build',
    }),
    publishable: Flags.boolean({
      required: false,
      description:
        'Only build resources that are publishable (publish: true) and their dependencies',
    }),
  };
  static enableJsonFlag = true;
  static strict = false;

  async run(): Promise<Record<string, BuildResourceMeta>> {
    const { argv, flags } = await this.parse(ResourcesBuildCommand);
    const { monorepo } = getContext();

    let toBuild: string[];
    if (argv.length > 0) {
      toBuild = argv as string[];
    } else if (flags.publishable) {
      toBuild = monorepo.resources
        .filter((r) => r.publish === true)
        .map((r) => r.id);
    } else {
      toBuild = monorepo.resources.map((c) => c.id);
    }

    return monorepo.run(new BuildResourcesOperation(), {
      dryRun: flags['dry-run'],
      force: flags.force,
      silent: flags.json,
      resources: toBuild,
    });
  }
}
