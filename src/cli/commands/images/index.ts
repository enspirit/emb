import { Command } from '@oclif/core';
import { ImageInfo } from 'dockerode';

import { listImages } from '../../../docker/index.js';
import { getContext } from '../../context.js';

export default class PluginsIndex extends Command {
  static description = 'List available images.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};

  public async run(): Promise<Array<ImageInfo>> {
    const { flags } = await this.parse(PluginsIndex);
    const context = await getContext();

    return listImages({
      filters: {
        label: [`emb/project=${context.monorepo.project.name}`],
      },
    });
  }
}
