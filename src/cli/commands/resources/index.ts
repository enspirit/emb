import { Flags } from '@oclif/core';
import { printTable } from '@oclif/table';

import { FlavoredCommand, getContext, TABLE_DEFAULTS } from '@/cli';
import { ResourceConfig } from '@/config/schema.js';
import { ResourceFactory } from '@/monorepo/resources/ResourceFactory.js';

export default class ResourcesIndex extends FlavoredCommand<
  typeof ResourcesIndex
> {
  static description = 'List resources.';
  static enableJsonFlag = true;
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --publishable',
  ];
  static flags = {
    publishable: Flags.boolean({
      description: 'Only show resources that are publishable (publish: true)',
      required: false,
    }),
  };

  public async run(): Promise<Array<ResourceConfig>> {
    const { flags } = await this.parse(ResourcesIndex);
    const { monorepo } = await getContext();

    // Filter resources if --publishable flag is set
    let filteredResources = monorepo.resources;
    if (flags.publishable) {
      filteredResources = filteredResources.filter((r) => r.publish === true);
    }

    const resources = await Promise.all(
      filteredResources.map(async (config) => {
        const component = monorepo.component(config.component);
        const builder = ResourceFactory.factor(config.type, {
          config,
          monorepo,
          component,
        });
        return {
          ...config,
          reference: await builder.getReference(),
        };
      }),
    );

    if (!flags.json) {
      const displayData = resources.map((r) => ({
        ...r,
        publishable: r.publish ? '✓' : '',
      }));
      printTable({
        ...TABLE_DEFAULTS,
        columns: ['id', 'name', 'type', 'publishable', 'reference'],
        data: displayData,
        sort: {
          id: 'asc',
        },
      });
    }

    return resources;
  }
}
