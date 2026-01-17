import { spawn } from 'node:child_process';
import { Writable } from 'node:stream';
import * as z from 'zod';

import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/cli/docker/compose/logs/
 */
export const ComposeLogsOperationInputSchema = z
  .object({
    services: z
      .array(z.string())
      .optional()
      .describe('The list of services to show logs for (all if omitted)'),
    follow: z.boolean().optional().describe('Follow log output'),
    timestamps: z.boolean().optional().describe('Show timestamps'),
    tail: z
      .number()
      .optional()
      .describe('Number of lines to show from the end'),
  })
  .optional();

export class ComposeLogsOperation extends AbstractOperation<
  typeof ComposeLogsOperationInputSchema,
  void
> {
  /**
   * @param out Optional writable stream to capture output. If not provided,
   *            output is streamed directly to the terminal (stdio: 'inherit').
   */
  constructor(protected out?: Writable) {
    super(ComposeLogsOperationInputSchema);
  }

  protected async _run(
    input: z.input<typeof ComposeLogsOperationInputSchema>,
  ): Promise<void> {
    const { monorepo } = this.context;

    const cmd = 'docker';
    const args = ['compose', 'logs'];

    const follow = input?.follow ?? true;
    if (follow) {
      args.push('-f');
    }

    if (input?.timestamps) {
      args.push('-t');
    }

    if (input?.tail !== undefined) {
      args.push('--tail', String(input.tail));
    }

    if (input?.services && input.services.length > 0) {
      args.push(...input.services);
    }

    const child = spawn(cmd, args, {
      stdio: this.out ? 'pipe' : 'inherit',
      cwd: monorepo.rootDir,
    });

    if (this.out && child.stdout && child.stderr) {
      child.stdout.pipe(this.out, { end: false });
      child.stderr.pipe(this.out, { end: false });
    }

    const forward = (sig: NodeJS.Signals) => {
      try {
        child.kill(sig);
      } catch {}
    };

    const signals: Array<NodeJS.Signals> = [
      'SIGINT',
      'SIGTERM',
      'SIGHUP',
      'SIGQUIT',
    ];
    signals.forEach((sig) => {
      process.on(sig, () => forward(sig));
    });

    return new Promise((resolve, reject) => {
      child.on('error', (err) => {
        reject(
          new Error(`Failed to execute docker compose logs: ${err.message}`),
        );
      });

      child.on('exit', (code) => {
        if (code !== null && code !== 0) {
          reject(new Error(`docker compose logs exited with code ${code}`));
        } else {
          resolve();
        }
      });
    });
  }
}
