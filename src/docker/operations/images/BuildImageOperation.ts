import { Transform, Writable } from 'node:stream';
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
    const logFile = await this.context.monorepo.store.createWriteStream(
      `logs/docker/build/${input.tag}.log`,
    );

    const decodeBuildkit = new Transform({
      transform: async (chunk, encoding, callback) => {
        try {
          try {
            const { aux } = JSON.parse(chunk);
            const { vertexes } = await decodeBuildkitStatusResponse(aux);

            vertexes.forEach((v: { name: string }) => {
              logFile.write(`${JSON.stringify(v)}\n`);
              this.out?.write(`${v.name}\n`);
            });
          } catch {
            //
          }

          callback();
        } catch (error) {
          console.error('__OOPS', error);
        }
      },
    });

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
