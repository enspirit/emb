import { CommandExecError } from '@';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { PassThrough, Writable } from 'node:stream';
import * as z from 'zod';

import { decodeBuildkitStatusResponse } from '@/docker';
import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/api/engine/version/v1.37/#tag/Image/operation/ImageBuild
 */
export const BuildImageOperationInputSchema = z.object({
  //
  context: z.string().describe('Path to the build context'),
  dockerfile: z
    .string()
    .optional()
    .default('Dockerfile')
    .describe('Path within the build context to the Dockerfile.'),
  src: z.array(z.string()),
  tag: z.z
    .string()
    .optional()
    .describe('latest')
    .describe('A name and optional tag to apply to the image in the name:tag'),
  //
  buildArgs: z
    .record(z.string(), z.string())
    .optional()
    .describe('Map of string pairs for build-time variables'),
  labels: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Arbitrary key/value labels to set on the image, as a JSON map of string pairs.',
    ),
  target: z.string().optional().describe('Target build stage'),
});

export class BuildImageOperation extends AbstractOperation<
  typeof BuildImageOperationInputSchema,
  void
> {
  constructor(private out?: Writable) {
    super(BuildImageOperationInputSchema);
  }

  protected async _run(
    input: z.input<typeof BuildImageOperationInputSchema>,
  ): Promise<void> {
    return this._buildWithDockerCLI(input);
  }

  protected async _buildWithDockerCLI(
    input: z.input<typeof BuildImageOperationInputSchema>,
  ): Promise<void> {
    const labels = Object.entries(input.labels || {})
      .reduce<Array<string>>((arr, [key, value]) => {
        arr.push(`${key.trim()}=${value.trim()}`);
        return arr;
      }, [])
      .join(',');

    const args = [
      'build',
      input.context,
      '-f',
      join(input.context, input.dockerfile || 'Dockerfile'),
      '--label',
      labels,
    ];

    if (input.tag) {
      args.push('--tag', input.tag);
    }

    if (input.target) {
      args.push('--target', input.target);
    }

    Object.entries(input.buildArgs || []).forEach(([key, value]) => {
      args.push('--build-arg', `${key.trim()}=${value.trim()}`);
    });

    const logFile = await this.context.monorepo.store.createWriteStream(
      `logs/docker/build/${input.tag}.log`,
    );

    const tee = new PassThrough();
    tee.pipe(logFile);

    if (this.out) {
      tee.pipe(this.out);
    }

    tee.write('Building image with opts: ' + JSON.stringify(args));

    const child = await spawn('docker', args);

    child.stderr.pipe(tee);
    child.stdout.pipe(tee);

    return new Promise((resolve, reject) => {
      child.on('close', () => {
        resolve();
      });

      child.on('exit', (code, signal) => {
        if (code !== 0) {
          reject(
            new CommandExecError('Docker build failed', code || -1, signal),
          );
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Experimental with dockerode and the docker API directly
   */
  protected async _buildWithDockerode(
    input: z.input<typeof BuildImageOperationInputSchema>,
  ): Promise<void> {
    const logFile = await this.context.monorepo.store.createWriteStream(
      `logs/docker/build/${input.tag}.log`,
    );

    const stream = await this.context.docker.buildImage(
      {
        context: input.context,
        src: [...input.src],
      },
      {
        buildargs: input.buildArgs,
        dockerfile: input.dockerfile,
        labels: input.labels,
        t: input.tag,
        target: input.target,
        version: '2',
      },
    );

    return new Promise((resolve, reject) => {
      this.context.docker.modem.followProgress(
        stream,
        (err, _traces) => {
          return err ? reject(err) : resolve();
        },
        async (trace: { error?: string; aux?: string }) => {
          if (trace.error) {
            logFile.write(trace.error + '\n');
            this.out?.write(trace.error + '\n');
            reject(trace.error);
          } else {
            try {
              const { vertexes } = await decodeBuildkitStatusResponse(
                trace.aux as string,
              );
              vertexes.forEach((v: { name: string }) => {
                // logStream.write(JSON.stringify(v) + '\n');
                logFile.write(v.name + '\n');
                this.out?.write(v.name + '\n');
              });
            } catch (error) {
              console.error(error);
            }
          }
        },
      );
    });
  }
}
