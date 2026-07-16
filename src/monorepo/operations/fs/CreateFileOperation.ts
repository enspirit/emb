import { execa } from 'execa';
import {
  chmod,
  mkdir,
  open,
  statfs,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { dirname } from 'node:path';
import { Writable } from 'node:stream';
import * as z from 'zod';

import { AbstractOperation } from '@/operations';

const schema = z.object({
  //
  path: z.string().describe('Path to the file to create'),
  content: z.string().optional().describe('Content to write to the file'),
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

      return;
    } catch (error) {
      // Ignore ENOENT error (file does not exist)
      if ((error as { code: string })?.code !== 'ENOENT') {
        throw error;
      }
    }

    await mkdir(dirname(input.path), { recursive: true });

    if (input.content !== undefined) {
      // File-resource content is produced through monorepo.expand(), which
      // resolves ${vault:...}/${op:...}/${env:...} secrets. Write it owner-only
      // so the materialized secret is never world-readable. writeFile's mode is
      // masked by the process umask, so force it with an explicit chmod (as
      // VaultTokenCache does).
      await writeFile(input.path, input.content, { mode: 0o600 });
      await chmod(input.path, 0o600);
    } else if (input.script) {
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
