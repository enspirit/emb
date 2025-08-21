import { Flags } from '@oclif/core';

import { FlavoredCommand } from '@/cli';
import { PushImagesOperation } from '@/docker/operations/images/PushImagesOperation.js';

export default class ImagesPush extends FlavoredCommand<typeof ImagesPush> {
  static description = 'Push docker images.';
  static enableJsonFlag = true;
  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --registry my.registry.io --retag newtag',
  ];
  static flags = {
    registry: Flags.string({
      name: 'registry',
      description: 'Override the registry to push to',
    }),
    retag: Flags.string({
      name: 'retag',
      description: 'Override the original tag to push to a new tag',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ImagesPush);
    const { monorepo } = this.context;

    await monorepo.run(new PushImagesOperation(process.stdout), {
      registry: flags.registry,
      retag: flags.retag,
    });
  }
}
