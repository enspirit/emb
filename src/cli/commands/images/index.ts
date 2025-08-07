import { Command, Flags } from '@oclif/core';
import { ImageInfo } from 'dockerode';

import { listImages } from '../../../docker/index.js';
import { getContext } from '../../context.js';

export default class ImagesIndex extends Command {
  static description = 'List available images.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    all: Flags.boolean({
      char: 'a',
      default: false,
      description:
        'Show all images. Only images from a final layer (no children) are shown by default.',
      name: 'all',
      required: false,
    }),
  };

  public async run(): Promise<Array<ImageInfo>> {
    const { flags } = await this.parse(ImagesIndex);
    const context = await getContext();

    const images = await listImages({
      all: flags.all,
      filters: {
        label: [`emb/project=${context.monorepo.name}`],
      },
    });

    const imageNames = images.reduce((imgs, img) => {
      const tags = (img.RepoTags || [])?.filter(
        (tag) => tag.indexOf(context.monorepo.name) === 0,
      );

      return [...imgs, ...tags];
    }, [] as Array<string>);

    imageNames.forEach((img) => {
      this.log('*', img);
    });

    return images;
  }
}
