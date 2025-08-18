import { Args, Flags } from '@oclif/core';

import { FlavoredCommand, getContext } from '@/cli';
import { ComposeRestartOperation } from '@/docker/index.js';
import { Component } from '@/monorepo/component.js';

export default class RestartComand extends FlavoredCommand<
  typeof RestartComand
> {
  static description = 'Restart the whole project.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    'no-deps': Flags.boolean({
      char: 'f',
      default: false,
      description: "Don't restart depdendent components",
      name: 'no-deps',
    }),
  };
  static args = {
    component: Args.string({
      name: 'component',
      description: 'The component(s) to restart',
    }),
  };
  static strict = false;

  public async run(): Promise<void> {
    const { flags, argv } = await this.parse(RestartComand);
    const { monorepo } = getContext();

    let components: Array<Component> | undefined;

    if (argv.length > 0) {
      components =
        argv.length > 0
          ? (argv as string[]).map((name) => monorepo.component(name))
          : monorepo.components;
    }

    await monorepo.run(new ComposeRestartOperation(), {
      noDeps: flags['no-deps'],
      services: components?.map((c) => c.name),
    });
  }
}
