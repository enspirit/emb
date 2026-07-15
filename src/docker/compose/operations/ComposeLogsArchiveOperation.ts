import { ChildProcess, spawn } from 'node:child_process';
import { createWriteStream, WriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import * as z from 'zod';

import { AbstractOperation } from '@/operations';

/**
 * Pipes a child process's stdout/stderr into a write stream and settles once
 * the process has CLOSED (all stdio flushed) and the stream has finished.
 * Rejects on a non-zero exit code, a spawn error, or a write-stream error.
 * Listening on 'close' (not 'exit') guarantees stdio buffers are drained before
 * the stream is ended, avoiding a write-after-end on the log file.
 */
export const pipeProcessToLog = (
  child: ChildProcess,
  writeStream: WriteStream,
  label: string,
): Promise<void> =>
  new Promise((resolve, reject) => {
    writeStream.on('error', reject);

    child.stdout?.pipe(writeStream, { end: false });
    child.stderr?.pipe(writeStream, { end: false });

    child.on('error', (err) => {
      reject(new Error(`Failed to get logs for ${label}: ${err.message}`));
    });

    child.on('close', (code) => {
      writeStream.end(() => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `Failed to archive logs for ${label}: docker compose logs exited with code ${code}`,
            ),
          );
        }
      });
    });
  });

export const ComposeLogsArchiveOperationInputSchema = z
  .object({
    services: z
      .array(z.string())
      .optional()
      .describe('The list of services to archive logs for (all if omitted)'),
    outputDir: z
      .string()
      .optional()
      .describe(
        'Output directory for log files (defaults to .emb/<flavor>/logs/docker/compose)',
      ),
    timestamps: z.boolean().optional().describe('Include timestamps in logs'),
    tail: z
      .number()
      .optional()
      .describe('Number of lines to show from the end'),
  })
  .optional();

export interface ArchivedLogFile {
  path: string;
  service: string;
}

export class ComposeLogsArchiveOperation extends AbstractOperation<
  typeof ComposeLogsArchiveOperationInputSchema,
  ArchivedLogFile[]
> {
  constructor() {
    super(ComposeLogsArchiveOperationInputSchema);
  }

  protected async _run(
    input: z.input<typeof ComposeLogsArchiveOperationInputSchema>,
  ): Promise<ArchivedLogFile[]> {
    const { monorepo, compose } = this.context;

    // Determine which services to archive
    // If not specified, get all services from docker-compose.yml
    const serviceNames = input?.services ?? (await compose.getServiceNames());

    // Determine output directory
    const outputDir =
      input?.outputDir ?? monorepo.store.join('logs/docker/compose');

    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    // Archive logs for each service
    const archivePromises = serviceNames.map(async (serviceName) => {
      const logPath = join(outputDir, `${serviceName}.log`);
      await this.archiveServiceLogs(serviceName, logPath, input);
      return { service: serviceName, path: logPath };
    });

    return Promise.all(archivePromises);
  }

  private async archiveServiceLogs(
    serviceName: string,
    outputPath: string,
    input: z.input<typeof ComposeLogsArchiveOperationInputSchema>,
  ): Promise<void> {
    const { monorepo } = this.context;

    // Ensure parent directory exists
    await mkdir(dirname(outputPath), { recursive: true });

    const cmd = 'docker';
    const args = ['compose', 'logs', '--no-color'];

    if (input?.timestamps) {
      args.push('-t');
    }

    if (input?.tail !== undefined) {
      args.push('--tail', String(input.tail));
    }

    args.push(serviceName);

    const writeStream: WriteStream = createWriteStream(outputPath);

    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: monorepo.rootDir,
    });

    return pipeProcessToLog(child, writeStream, serviceName);
  }
}
