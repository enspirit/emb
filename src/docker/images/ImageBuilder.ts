import { getContext } from '@';
import { Manager } from '@listr2/manager';
import { createColors } from 'colorette';
import {
  ListrDefaultRendererLogLevels,
  ListrLogger,
  ListrTask,
  PRESET_TIMER,
} from 'listr2';

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
        collapseSkips: true,
        collapseSubtasks: false,
        color: {
          // @ts-expect-error not sure why
          [ListrDefaultRendererLogLevels.SKIPPED_WITH_COLLAPSE]:
            createColors().green,
        },
        icon: {
          [ListrDefaultRendererLogLevels.SKIPPED_WITH_COLLAPSE]: '♺',
        },
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
        async task(context, task) {
          const buildTasks: Array<ListrTask> = components.map((cmp) => {
            return {
              rendererOptions: { persistentOutput: true },
              retry: options.retry,

              async task(_ctx, task) {
                const logStream = await monorepo.store.createWriteStream(
                  `logs/docker/build/${cmp.name}.log`,
                );

                const result = await buildDockerImage(
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

                // No result means we skipped the build thanks to our own caching mechanism
                if (!result) {
                  task.title += ' (cache hit)';
                  task.skip();
                }

                task.output = '';
              },
              title: `Build ${cmp.name}`,
            };
          });

          return task.newListr(buildTasks, {
            concurrent: options.concurreny,
            exitOnError: options.failfast,
            rendererOptions: {
              collapseSkips: true,
              collapseSubtasks: false,
            },
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
