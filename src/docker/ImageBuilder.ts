import { Manager } from '@listr2/manager';
import { ListrLogger, ListrLogLevels, PRESET_TIMER } from 'listr2';

import { getContext } from '../cli/context.js';
import { EmbContext } from '../types.js';
import { buildDockerImage } from './buildImage.js';

export type BuildOptions = {
  components?: Array<string>;
  concurreny?: number;
  failfast?: boolean;
};

export class ImageBuilder {
  private logger = new ListrLogger({ useIcons: false });
  private manager: Manager<EmbContext>;
  private options: BuildOptions;

  constructor(options?: BuildOptions) {
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
          task(ctx) {
            Object.assign(ctx, getContext());
          },
          title: 'Load monorepo config',
        },
        {
          task(context, task) {
            return task.newListr(
              context.monorepo.components
                .filter((cmp) =>
                  options.components
                    ? options.components.includes(cmp.name)
                    : true,
                )
                .map((cmp) => {
                  return {
                    rendererOptions: { persistentOutput: true },
                    async task(_ctx, task) {
                      await buildDockerImage(
                        await cmp.toDockerBuild(),
                        (progress) => {
                          task.output = progress?.error || progress?.name || '';
                        },
                      );
                      task.output = '';
                    },
                    title: `Build ${cmp.name}`,
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
