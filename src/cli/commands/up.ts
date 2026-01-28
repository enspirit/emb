import { Args, Flags } from '@oclif/core';

import { FlavoredCommand, getContext } from '@/cli';
import { ComposeUpOperation } from '@/docker/index.js';
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
    service: Args.string({
      name: 'service',
      description: 'The service(s) to build and start',
    }),
  };
  static strict = false;

  public async run(): Promise<void> {
    const { flags, argv } = await this.parse(UpCommand);
    const { monorepo, compose } = getContext();

    let services: string[] | undefined;
    let resources: Array<string> | undefined;

    if (argv.length > 0) {
      // Validate service names against docker-compose.yml
      services = await compose.validateServices(argv as string[]);

      // Build resources for services that have corresponding components
      const componentNames = new Set(monorepo.components.map((c) => c.name));
      const componentsToBuild = services.filter((s) => componentNames.has(s));

      resources = componentsToBuild.reduce<Array<string>>((resources, name) => {
        const component = monorepo.component(name);
        return [
          ...resources,
          ...Object.values(component.resources).map((r) => r.id),
        ];
      }, []);
    } else {
      resources = monorepo.resources.map((r) => r.id);
    }

    // Only build resources if there are any to build
    if (resources && resources.length > 0) {
      await monorepo.run(new BuildResourcesOperation(), {
        force: flags.force,
        resources,
      });
    }

    await monorepo.run(new ComposeUpOperation(), {
      forceRecreate: flags.force,
      services,
    });
  }
}
