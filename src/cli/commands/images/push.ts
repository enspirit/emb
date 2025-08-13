import { getContext } from '@';
import { Flags } from '@oclif/core';

import { BaseCommand } from '@/cli/index.js';

export default class ImagesPush extends BaseCommand {
  static description =
    'Push project images into a distant registry, with potential retagging.';
  static enableJsonFlag = true;
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --flavor production --registry distant.io --tag staging',
  ];
  static flags = {
    registry: Flags.string({
      name: 'registry',
      description: 'The distant registry when using image re-tagging',
      required: false,
    }),
    tag: Flags.string({
      name: 'tag',
      description: 'The tag to use for retagging',
      required: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ImagesPush);
    const context = await getContext();

    const images = context.monorepo.resources.filter(
      (r) => r.type === 'docker/image',
    );

    console.log(images);
  }
}
