import { Command, Flags } from '@oclif/core';
import { PruneImagesInfo } from 'dockerode';

import { pruneImages } from '../../../docker/index.js';
import { getContext } from '../../context.js';

export default class ImagesPrune extends Command {
  static description = 'Prune project images.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    all: Flags.boolean({
      char: 'a',
      default: false,
      description:
        'Prune all images. When set to true all images will be pruned, not only dangling ones',
      name: 'all',
      required: false,
    }),
  };

  public async run(): Promise<PruneImagesInfo> {
    const { flags } = await this.parse(ImagesPrune);
    const context = await getContext();

    const info = await pruneImages({
      dangling: !flags.all,
      label: [`emb/project=${context.monorepo.project.name}`],
    });

    info.ImagesDeleted?.forEach((d) => {
      if (d.Deleted) {
        this.log('Deleted', d.Deleted);
      }

      if (d.Untagged) {
        this.log('Untagged', d.Untagged);
      }
    });

    this.log('Space reclaimed', info.SpaceReclaimed);

    return info;
  }
}
