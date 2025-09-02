import { Exec } from '@kubernetes/client-node';
import { Args, Flags } from '@oclif/core';

import { getContext, KubernetesCommand } from '@/cli';
import { GetDeploymentPodsOperation } from '@/kubernetes/operations/GetDeploymentPodsOperation.js';
import { enableRawMode } from '@/utils/streams.js';

export default class PodShellCommand extends KubernetesCommand {
  static aliases: string[] = ['shell'];
  static description = 'Get a shell on a deployed component.';
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
    const { flags, args } = await this.parse(PodShellCommand);
    const { monorepo, kubernetes } = await getContext();

    const pods = await monorepo.run(new GetDeploymentPodsOperation(), {
      namespace: flags.namespace,
      deployment: args.component,
    });

    if (pods.length === 0) {
      throw new Error(`No running pod found for component ${args.component}`);
    }

    const pod = pods[0];
    const container = pod.spec!.containers[0];

    const exec = new Exec(kubernetes.config);

    enableRawMode(process.stdin);

    const res = await exec.exec(
      flags.namespace,
      pod.metadata!.name!,
      container.name!,
      [flags.shell],
      process.stdout,
      process.stderr,
      process.stdin,
      true,
    );

    res.on('close', () => {
      // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
      process.exit(0);
    });
  }
}
