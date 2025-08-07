import { Command } from '@oclif/core';
import { PruneContainersInfo } from 'dockerode';

import { pruneContainers } from '../../../docker/index.js';
import { getContext } from '../../context.js';

export default class ContainersPrune extends Command {
  static description = 'Prune containers.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];

  public async run(): Promise<PruneContainersInfo> {
    const { flags } = await this.parse(ContainersPrune);
    const context = await getContext();

    const info = await pruneContainers({
      label: [`emb/project=${context.monorepo.name}`],
    });

    info.ContainersDeleted?.forEach((d) => {
      if (d) {
        this.log('Deleted', d);
      }
    });

    this.log('Space reclaimed', info.SpaceReclaimed);

    return info;
  }
}
