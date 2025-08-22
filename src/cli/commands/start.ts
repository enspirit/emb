import { Args } from '@oclif/core';

import { BaseCommand, getContext } from '@/cli';
import { ComposeStartOperation } from '@/docker/index.js';
import { Component } from '@/monorepo/component.js';

export default class StartCommand extends BaseCommand {
  static description = 'Starts the whole project.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {};
  static args = {
    component: Args.string({
      name: 'component',
      description: 'The component(s) to start',
    }),
  };
  static strict = false;

  public async run(): Promise<void> {
    const { argv } = await this.parse(StartCommand);
    const { monorepo } = getContext();

    let components: Array<Component> | undefined;

    if (argv.length > 0) {
      components =
        argv.length > 0
          ? (argv as string[]).map((name) => monorepo.component(name))
          : monorepo.components;
    }

    await monorepo.run(new ComposeStartOperation(), {
      services: components?.map((c) => c.name),
    });
  }
}
