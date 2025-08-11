import { printTable } from '@oclif/table';

import { FlavoredCommand, getContext, TABLE_DEFAULTS } from '@/cli';
import { ResourceConfig } from '@/config/schema.js';

export default class ResourcesIndex extends FlavoredCommand<
  typeof ResourcesIndex
> {
  static description = 'List resources.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};

  public async run(): Promise<Array<ResourceConfig>> {
    const { flags } = await this.parse(ResourcesIndex);
    const { monorepo } = await getContext();

    const resources: Array<ResourceConfig> = await Promise.all(
      monorepo.resources.map(async (config) => {
        return {
          ...config,
        };
      }),
    );

    if (!flags.json) {
      printTable<ResourceConfig>({
        ...TABLE_DEFAULTS,
        columns: ['name', 'type', 'id'],
        data: resources,
        sort: {
          name: 'asc',
        },
      });
    }

    return resources;
  }
}
