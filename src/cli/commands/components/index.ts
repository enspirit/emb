import { printTable } from '@oclif/table';

import { FlavoredCommand, getContext, TABLE_DEFAULTS } from '@/cli';
import { ListContainersOperation, shortId } from '@/docker';

export type ComponentInfo = {
  container?: string;
  imageName: string;
  name: string;
  tag: string;
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

    // Get all running containers for this project
    // and then try to do a mapping. It's probably better than
    // doing N queries to list with specific filters
    const runningContainers = await monorepo.run(
      new ListContainersOperation(),
      {
        filters: {
          label: [`emb/project=${monorepo.name}`],
        },
      },
    );

    const components: Array<ComponentInfo> = await Promise.all(
      monorepo.components.map(async (cmp) => {
        const buildInfos = await cmp.toDockerBuild();
        const container = runningContainers.find((cont) => {
          return cont.Image === `${buildInfos.name}:${buildInfos.tag}`;
        });

        return {
          container: container?.Id ? shortId(container?.Id) : '',
          imageName: buildInfos.name,
          name: cmp.name,
          tag: buildInfos.tag,
        };
      }),
    );

    if (!flags.json) {
      printTable<ComponentInfo>({
        ...TABLE_DEFAULTS,
        columns: ['name', 'imageName', 'tag', 'container'],
        data: components,
        sort: {
          name: 'asc',
        },
      });
    }

    return components;
  }
}
