import { spawn } from 'node:child_process';
import { createWriteStream, WriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import * as z from 'zod';

import { AbstractOperation } from '@/operations';

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

    return new Promise((resolve, reject) => {
      const writeStream: WriteStream = createWriteStream(outputPath);

      const child = spawn(cmd, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: monorepo.rootDir,
      });

      child.stdout?.pipe(writeStream, { end: false });
      child.stderr?.pipe(writeStream, { end: false });

      child.on('error', (err) => {
        writeStream.end();
        reject(
          new Error(`Failed to get logs for ${serviceName}: ${err.message}`),
        );
      });

      child.on('exit', () => {
        writeStream.end();
        resolve();
      });
    });
  }
}
