import { PruneContainersInfo } from 'dockerode';
import * as z from 'zod';

import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/api/engine/version/v1.37/#tag/Container/operation/ContainerPrune
 */
const schema = z
  .object({
    filters: z
      .object({
        label: z.array(z.string()).describe('Labels on the container'),
      })
      .optional()
      .describe('Filters to process on the container list,'),
  })
  .optional();

export class PruneContainersOperation extends AbstractOperation<
  typeof schema,
  PruneContainersInfo
> {
  constructor() {
    super(schema);
  }

  protected async _run(
    input: z.input<typeof schema>,
  ): Promise<PruneContainersInfo> {
    let filters: Record<string, Array<string>> | undefined = {};

    if (input?.filters?.label) {
      filters.label = input.filters.label;
    }

    // Let's not even pass empty filters
    if (Object.keys(filters).length === 0) {
      filters = undefined;
    }

    return this.context.docker.pruneContainers({
      filters,
    });
  }
}
