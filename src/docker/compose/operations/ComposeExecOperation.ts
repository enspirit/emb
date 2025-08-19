import { spawn } from 'node:child_process';
import { Writable } from 'node:stream';
import * as z from 'zod';

import { ComposeExecError } from '@/errors.js';
import { AbstractOperation } from '@/operations';

const schema = z.object({
  command: z.string().describe('The command to execute on the service'),
  env: z
    .object()
    .catchall(z.string())
    .describe('Environment variables to pass to the execution')
    .optional(),
  service: z
    .string()
    .describe('The name of the compose service to exec a shell'),
});

export class ComposeExecOperation extends AbstractOperation<
  typeof schema,
  void
> {
  constructor(protected out?: Writable) {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<void> {
    const { monorepo } = this.context;

    const cmd = 'docker';
    const args = ['compose', 'exec'];

    // Add any env vars
    Object.entries(input.env || {}).forEach(([key, value]) => {
      args.push('-e', `${key.trim()}=${value.trim()}`);
    });

    // add component and script
    args.push(input.service, input.command);

    const child = spawn(cmd, args, {
      stdio: 'pipe',
      shell: true,
      cwd: monorepo.rootDir,
    });

    if (this.out) {
      child.stderr.pipe(this.out);
      child.stdout.pipe(this.out);
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
        reject(new Error(`Failed to execute docker compose: ${err.message}`));
      });

      child.on('exit', (code, signal) => {
        if (code !== null && code !== 0) {
          reject(
            new ComposeExecError(
              `The shell exited unexpectedly. ${code}`,
              code,
              signal,
            ),
          );
        } else {
          resolve();
        }
      });
    });
  }
}
