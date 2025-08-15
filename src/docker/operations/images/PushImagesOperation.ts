import * as z from 'zod';

import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/api/engine/version/v1.37/#tag/Image/operation/ImagePush
 */
const schema = z.object({
  images: z
    .array(z.string())
    .optional()
    .describe(
      'The names of images to push (The name should be provided without tag. Use the `tag` parameter to specify why tag to push)',
    ),
  tag: z
    .string()
    .optional()
    .default('latest')
    .describe('Tag of the images to push'),
});

export class PushImagesOperation extends AbstractOperation<
  typeof schema,
  void
> {
  constructor() {
    super(schema);
  }

  protected async _run(_input: z.input<typeof schema>): Promise<void> {}
}
