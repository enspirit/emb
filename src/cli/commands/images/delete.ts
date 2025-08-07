import { Command } from '@oclif/core';
import { Listr } from 'listr2';

import { deleteImage, listImages } from '../../../docker/index.js';
import { getContext } from '../../context.js';

export default class ImagesDelete extends Command {
  static description = 'Delete project images.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};

  public async run(): Promise<void> {
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
            await deleteImage(img);
          },
          title: `Delete ${img}`,
        };
      }),
    );

    await runner.run();
  }
}
