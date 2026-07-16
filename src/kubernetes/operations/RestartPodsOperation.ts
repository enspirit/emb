import { getContext } from '@';
import { PatchStrategy, setHeaderOptions } from '@kubernetes/client-node';
import { ListrTask } from 'listr2';
import * as z from 'zod';

import { AbstractOperation } from '@/operations';

const schema = z.object({
  namespace: z.string().describe('The namespace in which to restart pods'),
  deployments: z
    .array(z.string())
    .optional()
    .describe('The list of deployments to restart'),
});

export class PodsRestartOperation extends AbstractOperation<
  typeof schema,
  void
> {
  constructor() {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<void> {
    const { monorepo } = getContext();
    const manager = monorepo.taskManager();

    const deployments =
      input?.deployments || (await this.listDeployments(input.namespace));

    const tasks = deployments.map((name): ListrTask => {
      return {
        title: `Restart ${name}`,
        task: async () => {
          return this.patchDeployment(input.namespace, name);
        },
      };
    });

    manager.add(tasks);

    await manager.runAll();
  }

  private async patchDeployment(namespace: string, name: string) {
    // Use a strategic merge patch (like `kubectl rollout restart`) rather than
    // an RFC 6902 `add`: the server rejects `add` on
    // /spec/template/metadata/annotations/<key> when the annotations map does
    // not yet exist (common for minimal deployments). A strategic merge creates
    // the annotations map if absent and preserves existing entries.
    const body = {
      spec: {
        template: {
          metadata: {
            annotations: {
              'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
            },
          },
        },
      },
    };

    return this.context.kubernetes.apps.patchNamespacedDeployment(
      { namespace, name, body },
      setHeaderOptions('Content-Type', PatchStrategy.StrategicMergePatch),
    );
  }

  private async listDeployments(namespace: string): Promise<Array<string>> {
    const { items } =
      await this.context.kubernetes.apps.listNamespacedDeployment({
        namespace,
      });

    return items.map((i) => i.metadata?.name) as Array<string>;
  }
}
