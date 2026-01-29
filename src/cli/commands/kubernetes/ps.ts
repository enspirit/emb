import { Flags } from '@oclif/core';
import { printTable } from '@oclif/table';

import { getContext, KubernetesCommand, TABLE_DEFAULTS } from '@/cli';
import { timeAgo } from '@/utils/time.js';

export default class KPSCommand extends KubernetesCommand {
  static description = 'Show running pods.';
  static examples = ['<%= config.bin %> <%= command.id %>'];
  static flags = {
    watch: Flags.boolean({
      name: 'watch',
      allowNo: true,
    }),
  };
  static strict = false;

  public async run(): Promise<void> {
    const { flags } = await this.parse(KPSCommand);
    const { kubernetes } = getContext();
    const namespace = this.resolveNamespace(flags.namespace);

    const { items } = await kubernetes.core.listNamespacedPod({
      namespace,
    });

    const pods = items.map((i) => {
      const restarts =
        i.status?.containerStatuses
          ?.filter((s) => s.restartCount > 0)
          .map((c) => ({
            count: c.restartCount,
            ago: timeAgo(c.lastState?.terminated?.finishedAt),
          })) || [];

      const restart = restarts.length > 0 ? restarts[0] : null;

      return {
        name: i.metadata?.name,
        status: i.status?.phase,
        restarts: restart ? `${restart?.count} (${restart?.ago} ago)` : '',
        age: timeAgo(i.status?.startTime),
      };
    });

    printTable({
      ...TABLE_DEFAULTS,
      data: pods,
    });
  }
}
