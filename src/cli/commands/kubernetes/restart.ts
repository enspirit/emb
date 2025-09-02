import { Args } from '@oclif/core';

import { getContext, KubernetesCommand } from '@/cli';
import { PodsRestartOperation } from '@/kubernetes/index.js';

export default class KRestartCommand extends KubernetesCommand {
  static description = 'Restart pods of an instance.';
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static args = {
    deployment: Args.string({
      name: 'deployment',
      description: 'The deployment(s) to restart',
    }),
  };
  static strict = false;

  public async run(): Promise<void> {
    const { flags, argv } = await this.parse(KRestartCommand);
    const { monorepo } = getContext();

    await monorepo.run(new PodsRestartOperation(), {
      namespace: flags.namespace,
      deployments: argv.length > 0 ? (argv as Array<string>) : undefined,
    });
  }
}
