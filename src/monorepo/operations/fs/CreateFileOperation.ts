import { open, statfs, utimes } from 'node:fs/promises';
import { Writable } from 'node:stream';
import * as z from 'zod';

import { AbstractOperation } from '@/operations';

const schema = z.object({
  //
  path: z.string().describe('Path to the file to create'),
  force: z
    .boolean()
    .optional()
    .describe("Update 'atime' and 'mtime' if the file already exists"),
});

export class CreateFileOperation extends AbstractOperation<
  typeof schema,
  unknown
> {
  constructor(protected out?: Writable) {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<void> {
    try {
      await statfs(input.path);

      if (input.force) {
        await utimes(input.path, Date.now(), Date.now());
      }
    } catch (error) {
      if ((error as { code: string })?.code === 'ENOENT') {
        const fn = await open(input.path, 'a');
        return fn.close();
      }

      throw error;
    }
  }
}
