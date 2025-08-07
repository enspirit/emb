import { Command, Flags } from '@oclif/core';
import { Listr } from 'listr2';

import { deleteImage, listImages } from '../../../docker/index.js';
import { getContext } from '../../context.js';

export default class ImagesDelete extends Command {
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

    // De-duplicate this (also in images/index.ts)
    // TODO: move to repo/config abstraction
    const imageNames = images.reduce((imgs, img) => {
      const tags = (img.RepoTags || [])?.filter(
        (tag) => tag.indexOf(context.monorepo.name) === 0,
      );

      return [...imgs, ...tags];
    }, [] as Array<string>);

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
