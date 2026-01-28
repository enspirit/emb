import { Args } from '@oclif/core';

import { FlavoredCommand, getContext } from '@/cli';
import { ComposeDownOperation } from '@/docker';
import { Component } from '@/monorepo/component.js';

export default class DownCommand extends FlavoredCommand<typeof DownCommand> {
  static description = 'Stop the whole project.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};
  static args = {
    component: Args.string({
      name: 'component',
      description: 'The component(s) to stop and remove',
    }),
  };
  static strict = false;

  public async run(): Promise<void> {
    const { argv } = await this.parse(DownCommand);
    const { monorepo } = getContext();

    let components: Array<Component> | undefined;

    if (argv.length > 0) {
      components = (argv as string[]).map((name) => monorepo.component(name));
    }

    await monorepo.run(new ComposeDownOperation(), {
      services: components?.map((c) => c.name),
    });
  }
}
