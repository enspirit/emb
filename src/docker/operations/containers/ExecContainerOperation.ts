import { ExecCreateOptions } from 'dockerode';
import { Writable } from 'node:stream';
import * as z from 'zod';

import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/api/engine/version/v1.37/#tag/Exec/operation/ContainerExec
 */
const schema = z.object({
  attachStderr: z
    .boolean()
    .default(false)
    .optional()
    .describe('Attach to `stderr` of the exec command.'),
  attachStdin: z
    .boolean()
    .default(false)
    .optional()
    .describe('Attach to `stdin` of the exec command.'),
  attachStdout: z
    .boolean()
    .default(false)
    .optional()
    .describe('Attach to `stdout` of the exec command.'),
  container: z.string().describe('ID or name of the container'),
  env: z
    .record(z.string(), z.string())
    .optional()
    .describe('A list of environment variables in the form'),
  script: z.string().describe('Command to run, as a string'),
  tty: z.boolean().default(false).optional().describe('Allocate a pseudo-TTY'),
  workingDir: z
    .string()
    .optional()
    .describe(
      'The working directory for the exec process inside the container',
    ),
});

export class ContainerExecOperation extends AbstractOperation<
  typeof schema,
  void
> {
  constructor(protected out?: Writable) {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<void> {
    const container = await this.context.docker.getContainer(input.container);

    const envVars = Object.entries(input.env || {}).reduce<Array<string>>(
      (arr, [key, value]) => {
        return [...arr, `${key}=${value}`];
      },
      [],
    );

    const options: ExecCreateOptions = {
      AttachStderr: input.attachStderr,
      AttachStdin: input.attachStdin,
      AttachStdout: input.attachStdout,
      Cmd: ['bash', '-eu', '-o', 'pipefail', '-c', input.script],
      Env: envVars,
      Tty: input.tty,
      WorkingDir: input.workingDir,
    };

    const exec = await container.exec(options);

    const stream = await exec.start({});
    container.modem.demuxStream(
      stream,
      this.out || process.stdout,
      this.out || process.stderr,
    );

    await new Promise<void>((resolve, reject) => {
      const onError = (err: unknown) => reject(err);
      const onEnd = async () => {
        exec.inspect((error, res) => {
          if (error) return reject(error);
          const code = res?.ExitCode ?? 0;
          if (code !== 0) {
            const msg = res?.ProcessConfig?.entrypoint
              ? `container exec failed (exit ${code})`
              : `command failed (exit ${code})`;

            return reject(new Error(msg));
          }

          resolve();
        });
      };

      stream.on('error', onError);
      stream.on('end', onEnd);
      stream.on('close', onEnd); // some engines emit 'close' not 'end'
    });
  }
}
