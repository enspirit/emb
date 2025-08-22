import { ListrTask } from 'listr2';
import { join } from 'node:path/posix';
import { Transform, Writable } from 'node:stream';
import * as z from 'zod';

import { ResourceFactory } from '@/monorepo/resources/ResourceFactory.js';
import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/api/engine/version/v1.37/#tag/Image/operation/ImagePush
 */
const schema = z.object({
  images: z
    .array(z.string())
    .optional()
    .describe(
      'The names of images to push (The name should be provided without tag. Use the `tag` parameter to specify which tag to push)',
    ),
  tag: z.string().optional().describe('Tag of the images to push'),
  registry: z.string().optional().describe('Override the registry to push to'),
  retag: z
    .string()
    .optional()
    .describe('Override the original tag to push as a new tag'),
});

export class PushImagesOperation extends AbstractOperation<
  typeof schema,
  void
> {
  constructor(protected out?: Writable) {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<void> {
    const { monorepo } = this.context;

    const references = await Promise.all(
      monorepo.resources
        .filter((r) => r.type === 'docker/image')
        .map(async (config) => {
          const component = monorepo.component(config.component);
          const builder = ResourceFactory.factor(config.type, {
            config,
            monorepo,
            component,
          });
          return builder.getReference();
        }),
    );

    const manager = monorepo.taskManager();
    const tasks: Array<ListrTask> = references.map((fullName) => {
      return {
        title: `Push ${fullName}`,
        task: async (ctx, task) => {
          const { imgName, tag } = await this.retagIfNecessary(
            fullName,
            input.retag,
            input.registry,
          );

          task.title = `Pushing ${imgName}:${tag}`;

          return this.pushImage(imgName, tag, task.stdout());
        },
      };
    });

    return manager.run([
      {
        title: 'Push imags',
        async task(ctx, task) {
          return task.newListr(tasks, {
            rendererOptions: {
              collapseSubtasks: false,
              collapseSkips: true,
            },
          });
        },
      },
    ]);
  }

  private async retagIfNecessary(
    fullName: string,
    retag?: string,
    registry?: string,
  ) {
    let [imgName, tag] = fullName.split(':');

    // Retag if necessary
    if (retag || registry) {
      const dockerImage = await this.context.docker.getImage(fullName);

      tag = retag || tag;
      imgName = registry ? join(registry, imgName) : imgName;

      await dockerImage.tag({
        tag,
        repo: imgName,
      });
    }

    return { imgName, tag };
  }

  private async pushImage(repo: string, tag: string, out?: Writable) {
    const dockerImage = await this.context.docker.getImage(`${repo}:${tag}`);

    const stream = await dockerImage.push({
      authconfig: {
        username: process.env.DOCKER_USERNAME,
        password: process.env.DOCKER_PASSWORD,
      },
    });

    const transform = new Transform({
      transform(chunk, encoding, callback) {
        const lines = chunk.toString().split('\n');
        lines.forEach((line: string) => {
          if (!line.trim()) {
            return;
          }

          try {
            const { status } = JSON.parse(line.trim());
            out?.write(status + '\n');
          } catch (error) {
            out?.write(error + '\n');
          }
        });

        callback();
      },
    });

    stream.pipe(transform).pipe(process.stdout);

    await new Promise((resolve, reject) => {
      this.context.docker.modem.followProgress(stream, (err, data) => {
        if (err) {
          return reject(err);
        }

        const hasError = data.find((d) => Boolean(d.error));
        if (hasError) {
          return reject(new Error(hasError.error));
        }

        resolve(null);
      });
    });
  }
}
