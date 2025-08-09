import { PruneImagesInfo } from 'dockerode';
import * as z from 'zod';

import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/api/engine/version/v1.37/#tag/Image/operation/ImagePrune
 */
const schema = z
  .object({
    filters: z
      .object({
        label: z.array(z.string()).describe('Labels on the images'),
      })
      .optional()
      .describe('Filters to process on the images list,'),
  })
  .optional();

export class PruneImagesOperation extends AbstractOperation<
  typeof schema,
  PruneImagesInfo
> {
  constructor() {
    super(schema);
  }

  protected async _run(
    input: z.input<typeof schema>,
  ): Promise<PruneImagesInfo> {
    let filters: Record<string, Array<string>> | undefined = {};

    if (input?.filters?.label) {
      filters.label = input.filters.label;
    }

    // Let's not even pass empty filters
    if (Object.keys(filters).length === 0) {
      filters = undefined;
    }

    return this.context.docker.pruneImages({
      filters,
    });
  }
}
