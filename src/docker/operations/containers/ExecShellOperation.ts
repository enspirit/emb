import {
  getContext,
  ListContainersOperation,
  MultipleContainersFoundError,
  NoContainerFoundError,
  ShellExitError,
} from '@';
import { spawn } from 'node:child_process';
import * as z from 'zod';

import { AbstractOperation } from '@/operations';

const schema = z.object({
  shell: z.string().default('bash').optional(),
  component: z
    .string()
    .describe('The name of the component on which to run a shell'),
});

export class ExecShellOperation extends AbstractOperation<typeof schema, void> {
  constructor() {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<void> {
    const { monorepo } = getContext();

    const containers = await monorepo.run(new ListContainersOperation(), {
      filters: {
        label: [
          `emb/project=${monorepo.name}`,
          `emb/component=${input.component}`,
          `emb/flavor=${monorepo.currentFlavor}`,
        ],
      },
    });

    if (containers.length === 0) {
      throw new NoContainerFoundError(
        `No container found for component \`${input.component}\``,
        input.component,
      );
    }

    if (containers.length > 1) {
      throw new MultipleContainersFoundError(
        `More than one container found for component \`${input.component}\``,
        input.component,
      );
    }

    const cmd = 'docker';
    const args = ['exec', '-it', containers[0].Id, input?.shell || 'bash'];

    const child = spawn(cmd, args, {
      stdio: 'inherit',
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
              input.component,
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
