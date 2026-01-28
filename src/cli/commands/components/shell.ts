import { Args, Flags } from '@oclif/core';

import { BaseCommand, getContext } from '@/cli';
import { ComposeExecShellOperation } from '@/docker/index.js';
import { ShellExitError } from '@/errors.js';

export default class ComponentShellCommand extends BaseCommand {
  static aliases: string[] = ['shell'];
  static description = 'Get a shell on a running service.';
  static enableJsonFlag = false;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    shell: Flags.string({
      name: 'shell',
      char: 's',
      description: 'The shell to run',
      default: 'bash',
    }),
  };
  static args = {
    service: Args.string({
      name: 'service',
      description: 'The service you want to get a shell on',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags, args } = await this.parse(ComponentShellCommand);
    const { monorepo, compose } = getContext();

    // Validate service exists in docker-compose.yml
    await compose.validateService(args.service);

    try {
      await monorepo.run(new ComposeExecShellOperation(), {
        service: args.service,
        shell: flags.shell,
      });
    } catch (error) {
      if (error instanceof ShellExitError) {
        this.error(error);
      }

      throw error;
    }
  }
}
