import { CommandExecError } from '@';
import { execa } from 'execa';
import { Readable, Writable } from 'node:stream';
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

/**
 * https://docs.docker.com/reference/api/engine/version/v1.37/#tag/Exec/operation/ContainerExec
 */
const schema = z.object({
  env: z
    .record(z.string(), z.string())
    .optional()
    .describe('A list of environment variables in the form'),
  script: z.string().describe('Command to run, as a string'),
  interactive: z
    .boolean()
    .describe('Interactive command')
    .default(false)
    .optional(),
  workingDir: z
    .string()
    .optional()
    .describe(
      'The working directory for the exec process inside the container',
    ),
});

export class ExecuteLocalCommandOperation extends AbstractOperation<
  typeof schema,
  Readable
> {
  constructor(protected out?: Writable) {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<Readable> {
    try {
      if (input.interactive) {
        // For interactive mode, inherit all stdio streams so the child process
        // has direct access to the terminal TTY. This allows interactive CLI tools
        // (like ionic, npm, etc.) to detect TTY and show prompts.
        await execa(input.script, {
          cwd: input.workingDir,
          shell: true,
          env: input.env,
          stdio: 'inherit',
        });
        // Return an empty stream for type compatibility - the caller won't use it
        // since interactive mode outputs directly to the terminal
        return new Readable({
          read() {
            this.push(null);
          },
        });
      }

      // Non-interactive mode: capture output
      const proc = execa(input.script, {
        all: true,
        cwd: input.workingDir,
        shell: true,
        env: input.env,
      });

      // With all: true, proc.all is always defined
      proc.all!.pipe(this.out || process.stdout);

      await proc;
      return proc.all!;
    } catch (error) {
      if (isExecaError(error)) {
        const stderr = error.stderr?.trim();
        const message = stderr || error.shortMessage || error.message;
        throw new CommandExecError(message, error.exitCode ?? 1, error.signal);
      }

      throw error;
    }
  }
}
