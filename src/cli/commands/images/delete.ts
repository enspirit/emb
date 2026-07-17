import { getContext } from '@';
import { Flags } from '@oclif/core';
import { Listr } from 'listr2';

import { BaseCommand } from '@/cli/index.js';
import { deleteImage, listImages, projectImageTags } from '@/docker';

export default class ImagesDelete extends BaseCommand {
  static description = 'Delete project images.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    force: Flags.boolean({
      char: 'f',
      default: false,
      description:
        'Remove the image even if it is being used by stopped containers or has other tags',
      name: 'force',
      required: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ImagesDelete);
    const context = await getContext();

    const images = await listImages({
      filters: {
        label: [`emb/project=${context.monorepo.name}`],
      },
    });

    const imageNames = images.reduce(
      (imgs, img) => [
        ...imgs,
        ...projectImageTags(img.RepoTags, context.monorepo.name),
      ],
      [] as Array<string>,
    );

    const runner = new Listr(
      imageNames.map((img) => {
        return {
          async task() {
            await deleteImage(img, {
              force: flags.force,
            });
          },
          title: `Delete ${img}`,
        };
      }),
    );

    await runner.run();
  }
}
