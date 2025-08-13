import { printTable } from '@oclif/table';

import { FlavoredCommand, getContext, TABLE_DEFAULTS } from '@/cli';

export type ComponentInfo = {
  name: string;
};

export default class ComponentsIndex extends FlavoredCommand<
  typeof ComponentsIndex
> {
  static description = 'List components.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};

  public async run(): Promise<Array<ComponentInfo>> {
    const { flags } = await this.parse(ComponentsIndex);
    const { monorepo } = await getContext();

    const components: Array<ComponentInfo> = await Promise.all(
      monorepo.components.map(async (cmp) => {
        return {
          name: cmp.name,
        };
      }),
    );

    if (!flags.json) {
      printTable<ComponentInfo>({
        ...TABLE_DEFAULTS,
        columns: ['name'],
        data: components,
        sort: {
          name: 'asc',
        },
      });
    }

    return components;
  }
}
