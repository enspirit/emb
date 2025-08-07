import { Command, Flags } from '@oclif/core';
import { printTable } from '@oclif/table';

import { listImages } from '../../../docker/index.js';
import { shortId } from '../../../docker/utils.js';
import { timeAgo } from '../../../utils/time.js';
import { TABLE_DEFAULTS } from '../../constant.js';
import { getContext } from '../../context.js';

export type ImageInfo = {
  created: Date;
  imageId: string;
  name: string;
  size: number;
  tag: string;
};

export default class ImagesIndex extends Command {
  static description = 'List docker images.';
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

    const flatten = images.reduce((imgs, img) => {
      const matches = (img.RepoTags || [])
        ?.filter((tag) => tag.indexOf(context.monorepo.name) === 0)
        .map((m) => {
          const [name, tag] = m.split(':');

          return {
            created: new Date(img.Created * 1000),
            imageId: shortId(img.Id),
            name,
            size: img.Size,
            tag,
          };
        });

      return [...imgs, ...matches];
    }, [] as Array<ImageInfo>);

    if (!flags.json) {
      printTable({
        ...TABLE_DEFAULTS,
        columns: ['name', 'tag', 'imageId', 'created', 'size'],
        data: flatten.map((f) => {
          return {
            ...f,
            created: timeAgo(f.created),
            size: Math.floor(f.size / (1000 * 1000)) + 'MB',
          };
        }),
      });
    }

    return flatten;
  }
}
