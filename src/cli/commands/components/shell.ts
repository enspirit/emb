import { Args, Flags } from '@oclif/core';

import { BaseCommand, getContext } from '@/cli';
import { ComposeExecShellOperation } from '@/docker/index.js';
import { ShellExitError } from '@/errors.js';

export default class ComponentsLogs extends BaseCommand {
  static aliases: string[] = ['shell'];
  static description = 'Get a shell on a running component.';
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
    component: Args.string({
      name: 'component',
      description: 'The component you want to get a shell on',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags, args } = await this.parse(ComponentsLogs);
    const { monorepo } = await getContext();

    try {
      await monorepo.run(new ComposeExecShellOperation(), {
        service: args.component,
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
