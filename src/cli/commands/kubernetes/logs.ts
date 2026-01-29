import { Log } from '@kubernetes/client-node';
import { Args, Flags } from '@oclif/core';
import { PassThrough } from 'node:stream';

import { KubernetesCommand } from '@/cli';
import { GetComponentPodOperation } from '@/kubernetes/operations/index.js';

export default class KubernetesLogs extends KubernetesCommand {
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
    const namespace = this.resolveNamespace(flags.namespace);

    const component = monorepo.component(args.component);
    const { pod, container } = await monorepo.run(
      new GetComponentPodOperation(),
      {
        namespace,
        component,
      },
    );

    const k8sLogs = new Log(kubernetes.config);
    const transform = new PassThrough();
    transform.on('data', (chunk) => {
      process.stdout.write(chunk);
    });

    await k8sLogs.log(namespace, pod.metadata!.name!, container, transform, {
      follow: flags.follow,
      tailLines: 50,
      pretty: false,
      timestamps: true,
    });
  }
}
