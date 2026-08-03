import type { V1Pod } from '@kubernetes/client-node';

import * as z from 'zod';

import { getContext } from '@/context.js';
import { getKubernetesClient } from '@/kubernetes/client.js';
import { AbstractOperation } from '@/operations';

const schema = z.object({
  namespace: z.string().describe('The namespace in which to restart pods'),
  deployment: z.string(),
});

export class GetDeploymentPodsOperation extends AbstractOperation<
  typeof schema,
  Array<V1Pod>
> {
  constructor() {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<Array<V1Pod>> {
    const { monorepo } = getContext();
    const kubernetes = await getKubernetesClient();

    const selectorLabel =
      monorepo.config.defaults?.kubernetes?.selectorLabel ??
      'app.kubernetes.io/component';

    const res = await kubernetes.core.listNamespacedPod({
      namespace: input.namespace,
      labelSelector: `${selectorLabel}=${input.deployment}`,
    });

    return res.items;
  }
}
