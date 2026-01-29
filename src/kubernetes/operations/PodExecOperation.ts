import { Exec, V1Status } from '@kubernetes/client-node';
import { Writable } from 'node:stream';
import * as z from 'zod';

import { CliError } from '@/errors.js';
import { AbstractOperation } from '@/operations';

const schema = z.object({
  namespace: z.string().describe('The namespace of the pod'),
  podName: z.string().describe('The name of the pod'),
  container: z
    .string()
    .optional()
    .describe('The container name (required for multi-container pods)'),
  script: z.string().describe('Command to run, as a string'),
  env: z
    .record(z.string(), z.string())
    .optional()
    .describe('Environment variables to pass to the command'),
  interactive: z
    .boolean()
    .default(false)
    .optional()
    .describe('Whether the command is interactive'),
  tty: z.boolean().default(false).optional().describe('Allocate a pseudo-TTY'),
  workingDir: z
    .string()
    .optional()
    .describe('The working directory for the command'),
});

export class PodExecOperation extends AbstractOperation<typeof schema, void> {
  constructor(protected out?: Writable) {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<void> {
    const { kubernetes } = this.context;
    const exec = new Exec(kubernetes.config);

    const isInteractive = input.interactive || input.tty;

    // Build the command with optional workdir and env vars
    let { script } = input;

    // Handle working directory by wrapping the command
    if (input.workingDir) {
      script = `cd ${JSON.stringify(input.workingDir)} && ${script}`;
    }

    // Build environment variable exports
    const envExports = Object.entries(input.env || {})
      .map(([key, value]) => `export ${key}=${JSON.stringify(value)}`)
      .join('; ');

    if (envExports) {
      script = `${envExports}; ${script}`;
    }

    const command = ['sh', '-c', script];

    // Determine container name
    const containerName = input.container;
    if (!containerName) {
      throw new CliError('K8S_NO_CONTAINER', 'Container name is required', [
        'Specify kubernetes.container in component config:',
        '  components:',
        '    <component>:',
        '      kubernetes:',
        '        container: <container-name>',
      ]);
    }

    const stdout = isInteractive ? process.stdout : (this.out ?? null);
    const stderr = isInteractive ? process.stderr : (this.out ?? null);
    const stdin = isInteractive ? process.stdin : null;

    return new Promise<void>((resolve, reject) => {
      let exitCode = 0;
      let ws: ReturnType<typeof exec.exec> extends Promise<infer T> ? T : never;
      let sigintHandler: (() => void) | undefined;

      const cleanup = () => {
        // Restore stdin raw mode
        if (isInteractive && process.stdin.isTTY) {
          process.stdin.setRawMode?.(false);
        }

        // Remove SIGINT handler
        if (sigintHandler) {
          process.off('SIGINT', sigintHandler);
        }
      };

      const statusCallback = (status: V1Status) => {
        if (status.status === 'Success') {
          exitCode = 0;
        } else if (status.status === 'Failure') {
          // Try to extract exit code from the status message
          const match = status.message?.match(
            /command terminated with exit code (\d+)/,
          );
          exitCode = match ? Number.parseInt(match[1], 10) : 1;
        }
      };

      // Set raw mode for interactive sessions
      if (isInteractive && process.stdin.isTTY) {
        process.stdin.setRawMode?.(true);

        // Handle Ctrl+C gracefully
        sigintHandler = () => {
          cleanup();
          if (ws) {
            ws.close();
          }

          reject(new Error('Interrupted'));
        };

        process.on('SIGINT', sigintHandler);
      }

      exec
        .exec(
          input.namespace,
          input.podName,
          containerName,
          command,
          stdout,
          stderr,
          stdin,
          isInteractive ?? false,
          statusCallback,
        )
        .then((websocket) => {
          ws = websocket;

          websocket.on('close', () => {
            cleanup();

            if (exitCode === 0) {
              resolve();
            } else {
              reject(new Error(`command failed (exit ${exitCode})`));
            }
          });

          websocket.on('error', (error: Error) => {
            cleanup();
            reject(this.wrapError(error, input));
          });
        })
        .catch((error: Error) => {
          cleanup();
          reject(this.wrapError(error, input));
        });
    });
  }

  private wrapError(
    error: Error,
    input: z.input<typeof schema>,
  ): CliError | Error {
    const message = error.message || String(error);

    // Handle common Kubernetes API errors
    if (message.includes('not found') || message.includes('404')) {
      return new CliError(
        'K8S_POD_NOT_FOUND',
        `Pod "${input.podName}" not found in namespace "${input.namespace}"`,
        [
          `Check pod exists: kubectl get pod ${input.podName} -n ${input.namespace}`,
          `List pods: kubectl get pods -n ${input.namespace}`,
        ],
      );
    }

    if (message.includes('Forbidden') || message.includes('403')) {
      return new CliError(
        'K8S_FORBIDDEN',
        `Access denied to pod "${input.podName}" in namespace "${input.namespace}"`,
        [
          `Check permissions: kubectl auth can-i create pods/exec -n ${input.namespace}`,
          'Ensure your kubeconfig has the correct context and credentials',
        ],
      );
    }

    if (message.includes('Unauthorized') || message.includes('401')) {
      return new CliError(
        'K8S_UNAUTHORIZED',
        'Kubernetes authentication failed',
        [
          'Check your kubeconfig: kubectl config view',
          'Try re-authenticating: kubectl auth login',
        ],
      );
    }

    if (
      message.includes('connection refused') ||
      message.includes('ECONNREFUSED')
    ) {
      return new CliError(
        'K8S_CONNECTION_REFUSED',
        'Cannot connect to Kubernetes cluster',
        [
          'Check cluster is running: kubectl cluster-info',
          'Verify kubeconfig context: kubectl config current-context',
        ],
      );
    }

    // Return original error if not a known type
    return error;
  }
}
