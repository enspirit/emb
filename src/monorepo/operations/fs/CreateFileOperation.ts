import { execa } from 'execa';
import { open, statfs, utimes } from 'node:fs/promises';
import { Writable } from 'node:stream';
import * as z from 'zod';

import { AbstractOperation } from '@/operations';

const schema = z.object({
  //
  path: z.string().describe('Path to the file to create'),
  script: z.string().optional().describe('The script to generate the file'),
  cwd: z.string().optional().describe('Working directory to execute scripts'),
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
    // Check if the file exists, if so our work is done here
    try {
      await statfs(input.path);

      if (input.force) {
        await utimes(input.path, Date.now(), Date.now());
      }
    } catch (error) {
      // Ignore ENOENT error (file does not exist)
      if ((error as { code: string })?.code !== 'ENOENT') {
        throw error;
      }
    }

    if (input.script) {
      await execa(input.script, {
        all: true,
        cwd: input.cwd,
        shell: true,
      });
    } else {
      const fn = await open(input.path, 'a');
      fn.close();
    }
  }
}
