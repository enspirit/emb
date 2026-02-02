import { Args, Flags } from '@oclif/core';

import { FlavoredCommand, getContext } from '@/cli';
import {
  PublishResourceMeta,
  PublishResourcesOperation,
} from '@/monorepo/operations/resources/PublishResourcesOperation.js';

export default class ResourcesPublishCommand extends FlavoredCommand<
  typeof ResourcesPublishCommand
> {
  static args = {
    resources: Args.string({
      description: 'List of resources to publish (defaults to all publishable)',
      required: false,
    }),
  };
  static description = 'Publish resources to their registries';
  static examples = [
    `<%= config.bin %> <%= command.id %> --flavor production`,
    `<%= config.bin %> <%= command.id %> api:image --flavor production`,
  ];
  static flags = {
    'dry-run': Flags.boolean({
      required: false,
      description: 'Do not publish, just show what would be published',
    }),
  };
  static enableJsonFlag = true;
  static strict = false;

  async run(): Promise<Record<string, PublishResourceMeta>> {
    const { argv, flags } = await this.parse(ResourcesPublishCommand);
    const { monorepo } = getContext();

    // If no resources specified, publish all publishable resources
    const toPublish = argv.length > 0 ? (argv as string[]) : undefined;

    return monorepo.run(new PublishResourcesOperation(), {
      dryRun: flags['dry-run'],
      silent: flags.json,
      resources: toPublish,
    });
  }
}
