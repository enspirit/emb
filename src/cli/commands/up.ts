import { Args, Flags } from '@oclif/core';

import { FlavoredCommand, getContext } from '@/cli';
import { ComposeUpOperation } from '@/docker/index.js';
import { Component } from '@/monorepo/component.js';
import { BuildResourcesOperation } from '@/monorepo/operations/resources/BuildResourcesOperation.js';

export default class UpCommand extends FlavoredCommand<typeof UpCommand> {
  static description = 'Start the whole project.';
  static enableJsonFlag = true;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    force: Flags.boolean({
      char: 'f',
      default: false,
      description: 'Bypass caches, force the recreation of containers, etc',
      name: 'force',
    }),
  };
  static args = {
    component: Args.string({
      name: 'component',
      description: 'The component(s) to build and start',
    }),
  };
  static strict = false;

  public async run(): Promise<void> {
    const { flags, argv } = await this.parse(UpCommand);
    const { monorepo } = getContext();

    const buildFlags = [];
    if (flags.force) {
      buildFlags.push('--force');
    }

    let components: Array<Component> | undefined;
    let resources: Array<string> | undefined;

    if (argv.length > 0) {
      components =
        argv.length > 0
          ? (argv as string[]).map((name) => monorepo.component(name))
          : monorepo.components;

      resources = components.reduce<Array<string>>((resources, component) => {
        return [
          ...resources,
          ...Object.values(component.resources).map((r) => r.id),
        ];
      }, []);
    } else {
      resources = monorepo.resources.map((r) => r.id);
    }

    await monorepo.run(new BuildResourcesOperation(), {
      force: flags.force,
      resources,
    });

    await monorepo.run(new ComposeUpOperation(), {
      forceRecreate: flags.force,
      components: components?.map((c) => c.name),
    });
  }
}
