import { printTable } from '@oclif/table';

import { FlavoredCommand, getContext, TABLE_DEFAULTS } from '@/cli';
import { getTimeAgo } from '@/cli/utils.js';
import { ListContainersOperation } from '@/docker/operations/index.js';
import { shortId } from '@/docker/utils.js';

export type ComponentInfo = {
  component: string;
  name?: string;
  id?: string;
  created?: string;
  status?: string;
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

    const runningContainers = await monorepo.run(
      new ListContainersOperation(),
      {
        filters: {
          label: [`emb/project=${monorepo.name}`],
        },
      },
    );

    const components = monorepo.components.map((cmp) => {
      const container = runningContainers.find(
        (c) =>
          c.Labels['emb/component'] === cmp.name &&
          c.Labels['emb/flavor'] === monorepo.currentFlavor,
      );

      return {
        component: cmp.name,
        id: shortId(container?.Id),
        name: container?.Names?.join(', '),
        created: getTimeAgo(container?.Created),
        status: container?.Status,
      };
    });

    if (!flags.json) {
      printTable<(typeof components)[number]>({
        ...TABLE_DEFAULTS,
        columns: ['component', 'name', 'id', 'created', 'status'],
        data: components,
        sort: {
          name: 'asc',
        },
      });
    }

    return components;
  }
}
