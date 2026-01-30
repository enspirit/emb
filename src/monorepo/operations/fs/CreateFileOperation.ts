import { CommandExecError } from '@';
import { execa } from 'execa';
import { open, statfs, utimes, writeFile } from 'node:fs/promises';
import { Writable } from 'node:stream';
import * as z from 'zod';

import { AbstractOperation } from '@/operations';

// Type guard for execa error objects
function isExecaError(error: unknown): error is {
  stderr?: string;
  shortMessage?: string;
  message: string;
  exitCode?: number;
  signal?: NodeJS.Signals;
} {
  return error instanceof Error && 'exitCode' in error;
}

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

    if (input.content !== undefined) {
      await writeFile(input.path, input.content);
    } else if (input.script) {
      try {
        await execa(input.script, {
          all: true,
          cwd: input.cwd,
          shell: true,
        });
      } catch (error) {
        if (isExecaError(error)) {
          const stderr = error.stderr?.trim();
          const message = stderr || error.shortMessage || error.message;
          throw new CommandExecError(message, error.exitCode ?? 1, error.signal);
        }
        throw error;
      }
    } else {
      const fn = await open(input.path, 'a');
      fn.close();
    }
  }
}
