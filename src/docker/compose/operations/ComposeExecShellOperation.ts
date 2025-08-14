import { spawn } from 'node:child_process';
import * as z from 'zod';

import { ShellExitError } from '@/errors.js';
import { AbstractOperation } from '@/operations';

const schema = z.object({
  shell: z.string().default('bash').optional(),
  service: z
    .string()
    .describe('The name of the compose service to exec a shell'),
});

export class ComposeExecShellOperation extends AbstractOperation<
  typeof schema,
  void
> {
  constructor() {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<void> {
    const { monorepo } = this.context;
    const cmd = 'docker';
    const args = ['compose', 'exec', input.service, input.shell || 'bash'];

    const child = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: monorepo.rootDir,
      env: {
        ...process.env,
        DOCKER_CLI_HINTS: 'false',
      },
    });

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
        reject(new Error(`Failed to exeucte docker: ${err.message}`));
      });

      child.on('exit', (code, signal) => {
        if (code !== null && code !== 0) {
          reject(
            new ShellExitError(
              `The shell exited unexpectedly. ${code}`,
              input.service,
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
