import { Manager } from '@listr2/manager';
import { ListrLogger, ListrLogLevels, PRESET_TIMER } from 'listr2';

import { Component } from '../monorepo/component.js';
import { buildDockerImage } from './buildImage.js';
import { DockerComponentBuild } from './index.js';

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

    // Set context
    this.manager.add(
      [
        {
          async task(ctx, task) {
            ctx.components = await Promise.all(
              options.components.map((cmp) => {
                return cmp.toDockerBuild();
              }),
            );

            task.title = `Preparing build configs`;
          },
          title: 'Loading monorepo config',
        },
        {
          task(context, task) {
            return task.newListr(
              context.components.map((cmp) => {
                return {
                  rendererOptions: { persistentOutput: true },
                  retry: options.retry,
                  async task(_ctx, task) {
                    await buildDockerImage(cmp, (progress) => {
                      task.output = progress?.error || progress?.name || '';
                    });
                    task.output = '';
                  },
                  title: `Build ${cmp.name}:${cmp.tag}`,
                };
              }),
            );
          },
          title: 'Build components',
        },
      ],
      {
        concurrent: this.options.concurreny,
        exitOnError: this.options.failfast,
        rendererOptions: { collapseSubtasks: false },
      },
    );

    try {
      await this.manager.runAll();

      if (this.manager.errors.length > 0) {
        throw new Error('Build failed');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.log(ListrLogLevels.FAILED, error.message);
      } else {
        this.logger.log(ListrLogLevels.FAILED, error as string);
      }
    }
  }
}
