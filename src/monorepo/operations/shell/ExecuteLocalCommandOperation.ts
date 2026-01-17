import { execa, ExecaError } from 'execa';
import { Readable, Writable } from 'node:stream';
import * as z from 'zod';

import { CliError, CommandExecError } from '@/errors.js';
import { AbstractOperation } from '@/operations';

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
    const proc = input.interactive
      ? execa(input.script, {
          cwd: input.workingDir,
          shell: true,
          env: input.env,
          stdin: 'inherit',
        })
      : execa(input.script, {
          all: true,
          cwd: input.workingDir,
          shell: true,
          env: input.env,
        });

    proc.all?.pipe(this.out || process.stdout);

    try {
      await proc;
    } catch (error) {
      if (error instanceof ExecaError) {
        const { stderr } = error as ExecaError & { stderr?: string };
        const message = stderr?.trim() || error.shortMessage;

        // Provide helpful error messages for common docker compose errors
        if (message.includes('no configuration file provided')) {
          throw new CliError(
            'NO_COMPOSE_FILE',
            'No docker-compose.yml file found',
            [
              'Create a docker-compose.yml file in your project root',
              'Or use task commands instead: emb run <task>',
            ],
          );
        }

        throw new CommandExecError(
          message,
          error.exitCode ?? 1,
          error.signal as NodeJS.Signals | null,
        );
      }

      throw error;
    }

    return proc.all || proc.stdout;
  }
}
