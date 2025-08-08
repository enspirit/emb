import { Manager } from '@listr2/manager';
import { ListrLogger, ListrTask, PRESET_TIMER } from 'listr2';

import { getContext } from '@/cli';
import { buildDockerImage, DockerComponentBuild } from '@/docker';
import { Component, findBuildOrder } from '@/monorepo';

export type BuildOptions = {
  components: Array<Component>;
  concurreny?: number;
  failfast?: boolean;
  retry?: number;
};

export class ImageBuilder {
  private logger = new ListrLogger({ useIcons: false });
  private manager: Manager<{ components: Array<DockerComponentBuild> }>;
  private options: BuildOptions;

  constructor(options: BuildOptions) {
    this.options = {
      concurreny: 1,
      failfast: false,
      ...options,
    };

    this.manager = new Manager({
      collectErrors: 'minimal',
      concurrent: false,
      exitOnError: true,
      rendererOptions: {
        collapseErrors: false,
        collapseSkips: false,
        collapseSubtasks: false,
        timer: {
          ...PRESET_TIMER,
        },
      },
    });
  }

  public async run(): Promise<void> {
    const { options } = this;
    const { monorepo } = getContext();
    const components = findBuildOrder(monorepo.components);

    // Set context
    this.manager.add([
      {
        async task(ctx, task) {
          ctx.components = await Promise.all(
            components.map((cmp) => cmp.toDockerBuild()),
          );
          task.title = `Preparing build configs`;
        },
        title: 'Loading monorepo config',
      },
      {
        async task(context, task) {
          const buildTasks: Array<ListrTask> = context.components.map((cmp) => {
            const fullName = `${cmp.name}:${cmp.tag}`;

            return {
              rendererOptions: { persistentOutput: true },
              retry: options.retry,

              async task(_ctx, task) {
                const logStream = await monorepo.store.createWriteStream(
                  `logs/docker/build/${fullName}.log`,
                );

                await buildDockerImage(
                  cmp,
                  {
                    output: logStream,
                  },
                  (progress) => {
                    try {
                      task.output = progress?.error || progress?.name || '';
                    } catch {
                      // if the command fails we might still try to update the output
                      // and it triggers TypeError
                    }
                  },
                );
                task.output = '';
              },
              title: `Build ${fullName}`,
            };
          });

          return task.newListr(buildTasks, {
            concurrent: options.concurreny,
            exitOnError: options.failfast,
            rendererOptions: { collapseSubtasks: false },
          });
        },
        title: 'Build components',
      },
    ]);

    await this.manager.runAll();

    if (this.manager.errors.length > 0) {
      throw new Error('Build failed');
    }
  }
}
