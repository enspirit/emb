import { ImageInfo } from 'dockerode';
import * as z from 'zod';

import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/api/engine/version/v1.37/#tag/Image/operation/ImageList
 */
const schema = z
  .object({
    all: z
      .boolean()
      .optional()
      .describe(
        'Show all images. Only images from a final layer (no children) are shown by default.',
      ),
    filters: z
      .object({
        label: z.array(z.string()).describe('Labels on the images'),
      })
      .optional()
      .describe('Filters to process on the images list,'),
  })
  .optional();

export class ListImagesOperation extends AbstractOperation<
  typeof schema,
  Array<ImageInfo>
> {
  constructor() {
    super(schema);
  }

  protected async _run(
    input: z.input<typeof schema>,
  ): Promise<Array<ImageInfo>> {
    let filters: Record<string, Array<string>> | undefined = {};

    if (input?.filters?.label) {
      filters.label = input.filters.label;
    }

    // Let's not even pass empty filters
    if (Object.keys(filters).length === 0) {
      filters = undefined;
    }

    return this.context.docker.listImages({
      all: input?.all,
      filters,
    });
  }
}
