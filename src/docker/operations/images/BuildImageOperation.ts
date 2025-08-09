import * as z from 'zod';

import { decodeBuildkitStatusResponse } from '@/docker';
import { MobyTrace } from '@/docker/images/buildImage.js';
import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/api/engine/version/v1.37/#tag/Image/operation/ImageBuild
 */
const schema = z.object({
  buildArgs: z
    .record(z.string(), z.string())
    .optional()
    .describe('Map of string pairs for build-time variables'),
  context: z.string().describe('Path to the build context'),
  dockerfile: z
    .string()
    .describe('Path within the build context to the Dockerfile.'),
  labels: z
    .record(z.string(), z.string())
    .optional()
    .describe(
      'Arbitrary key/value labels to set on the image, as a JSON map of string pairs.',
    ),
  src: z.array(z.string()),
  tag: z.z
    .string()
    .describe('A name and optional tag to apply to the image in the name:tag'),
  target: z.string().optional().describe('Target build stage'),
});

export class BuildImageOperation extends AbstractOperation<
  typeof schema,
  Array<unknown>
> {
  constructor(private observer?: (progress: string) => void) {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<Array<unknown>> {
    const logStream = await this.context.monorepo.store.createWriteStream(
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
        (err, traces) => {
          logStream.close();

          return err ? reject(err) : resolve(traces);
        },
        async (trace: MobyTrace) => {
          if (trace.error) {
            logStream.close();
            reject(new Error(trace.error));
          } else {
            try {
              const { vertexes } = await decodeBuildkitStatusResponse(
                trace.aux as string,
              );
              vertexes.forEach((v: { name: string }) => {
                logStream.write(JSON.stringify(v) + '\n');
                this.observer?.(v.name);
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
