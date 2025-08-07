import { Command, Flags } from '@oclif/core';
import { PruneImagesInfo } from 'dockerode';
import { delay, Listr } from 'listr2';

import { deleteImage, listImages, pruneImages } from '../../../docker/index.js';
import { getContext } from '../../context.js';

export default class ImagesDelete extends Command {
  static description = 'Delete project images.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};

  public async run(): Promise<void> {
    const { flags } = await this.parse(ImagesDelete);
    const {
      monorepo: { project },
    } = await getContext();

    const images = await listImages({
      filters: {
        label: [`emb/project=${project.name}`],
      },
    });

    // De-duplicate this (also in images/index.ts)
    // TODO: move to repo/config abstraction
    const imageNames = images.reduce((imgs, img) => {
      const tags = (img.RepoTags || [])?.filter(
        (tag) => tag.indexOf(project.name) === 0,
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
