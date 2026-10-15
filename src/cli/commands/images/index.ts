import { Flags } from '@oclif/core';
import { printTable } from '@oclif/table';

import { FlavoredCommand, TABLE_DEFAULTS } from '@/cli';
import { getContext } from '@/context.js';
import { listImages, parseImageRef, projectImageTags, shortId } from '@/docker';
import { timeAgo } from '@/utils';

export type ImageInfo = {
  created: Date;
  imageId: string;
  name: string;
  size: number;
  tag: string;
};

export default class ImagesIndex extends FlavoredCommand<typeof ImagesIndex> {
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

    const flatten = images.flatMap((img) =>
      projectImageTags(img.RepoTags, context.monorepo.name).map((ref) => ({
        created: new Date(img.Created * 1000),
        imageId: shortId(img.Id),
        ...parseImageRef(ref),
        size: img.Size,
      })),
    );

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
