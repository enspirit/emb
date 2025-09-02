import { getContext } from '@';
import { V1Pod } from '@kubernetes/client-node';
import * as z from 'zod';

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
    const { kubernetes } = getContext();

    const res = await kubernetes.core.listNamespacedPod({
      namespace: input.namespace,
      labelSelector: `component=${input.deployment}`,
    });

    return res.items;
  }
}
