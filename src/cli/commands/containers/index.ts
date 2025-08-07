import { Command, Flags } from '@oclif/core';
import { ContainerInfo, ImageInfo } from 'dockerode';

import { listContainers, listImages } from '../../../docker/index.js';
import { getContext } from '../../context.js';

export default class ContainersIndex extends Command {
  static description = 'List containers.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    all: Flags.boolean({
      char: 'a',
      default: false,
      description:
        'Retun all containers. By default, only running containers are shown',
      name: 'all',
      required: false,
    }),
  };

  public async run(): Promise<Array<ContainerInfo>> {
    const { flags } = await this.parse(ContainersIndex);
    const context = await getContext();

    const { project } = context.monorepo;

    const containers = await listContainers({
      all: flags.all,
      filters: {
        label: [`emb/project=${project.name}`],
      },
    });

    containers.forEach((c) => {
      this.log('*', c.Names[0] || c.Id, '-', c.Status);
    });

    return containers;
  }
}
