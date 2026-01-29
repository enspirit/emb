import { Exec } from '@kubernetes/client-node';
import { Args, Flags } from '@oclif/core';

import { getContext, KubernetesCommand } from '@/cli';
import { GetComponentPodOperation } from '@/kubernetes/operations/index.js';
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
    const namespace = this.resolveNamespace(flags.namespace);

    const component = monorepo.component(args.component);
    const { pod, container } = await monorepo.run(
      new GetComponentPodOperation(),
      {
        namespace,
        component,
      },
    );

    const exec = new Exec(kubernetes.config);

    enableRawMode(process.stdin);

    const res = await exec.exec(
      namespace,
      pod.metadata!.name!,
      container,
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
