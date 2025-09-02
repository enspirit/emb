import { Log } from '@kubernetes/client-node';
import { Args, Flags } from '@oclif/core';
import { PassThrough } from 'node:stream';

import { KubernetesCommand } from '@/cli';
import { GetDeploymentPodsOperation } from '@/kubernetes/operations/GetDeploymentPodsOperation.js';

export default class KubernetesLogs extends KubernetesCommand {
  static aliases: string[] = ['logs'];
  static description = 'Follow kubernetes logs.';
  static enableJsonFlag = false;
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    follow: Flags.boolean({
      name: 'follow',
      char: 'f',
      allowNo: true,
      description: 'Follow log output',
      default: true,
    }),
  };
  static args = {
    component: Args.string({
      name: 'component',
      description: 'The component you want to see the logs of',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags, args } = await this.parse(KubernetesLogs);
    const { monorepo, kubernetes } = this.context;

    // Check the component name is valid (would raise otherwise)
    monorepo.component(args.component);

    const pods = await monorepo.run(new GetDeploymentPodsOperation(), {
      namespace: flags.namespace,
      deployment: args.component,
    });

    if (pods.length === 0) {
      throw new Error(`No running pod found for component ${args.component}`);
    }

    const k8sLogs = new Log(kubernetes.config);
    const transform = new PassThrough();
    transform.on('data', (chunk) => {
      process.stdout.write(chunk);
    });

    const pod = pods[0];
    const container = pod.spec!.containers[0];

    await k8sLogs.log(
      flags.namespace,
      pod.metadata!.name!,
      container.name,
      transform,
      {
        follow: flags.follow,
        tailLines: 50,
        pretty: false,
        timestamps: true,
      },
    );
  }
}
