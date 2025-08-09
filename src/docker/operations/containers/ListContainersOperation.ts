import { ContainerInfo } from 'dockerode';
import * as z from 'zod';

import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/api/engine/version/v1.37/#tag/Container/operation/ContainerList
 */
const schema = z
  .object({
    all: z
      .boolean()
      .optional()
      .describe(
        'Return all containers. By default, only running containers are shown',
      ),
    filters: z
      .object({
        label: z.array(z.string()).describe('Labels on the container'),
      })
      .optional()
      .describe('Filters to process on the container list,'),
    limit: z
      .int()
      .positive()
      .optional()
      .describe(
        'Return this number of most recently created containers, including non-running ones.',
      ),
  })
  .optional();

export class ListContainersOperation extends AbstractOperation<
  typeof schema,
  Array<ContainerInfo>
> {
  constructor() {
    super(schema);
  }

  protected async _run(
    input: z.input<typeof schema>,
  ): Promise<Array<ContainerInfo>> {
    let filters: Record<string, Array<string>> | undefined = {};

    if (input?.filters?.label) {
      filters.label = input.filters.label;
    }

    // Let's not even pass empty filters
    if (Object.keys(filters).length === 0) {
      filters = undefined;
    }

    return this.context.docker.listContainers({
      all: input?.all,
      filters,
      limit: input?.limit,
    });
  }
}
