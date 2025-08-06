import { Manager } from '@listr2/manager';
import { ListrLogger, ListrLogLevels } from 'listr2';

import { discoverComponents } from '../monorepo/discovery.js';
import { EmbContext } from '../types.js';
import { buildDockerImage } from './buildImage.js';
import { dockerComponent } from './index.js';

export type BuildOptions = {
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
      },
    });
  }

  public async run(): Promise<void> {
    this.manager.add(
      [
        {
          async task(ctx) {
            const folders = await discoverComponents();
            ctx.components = await Promise.all(
              folders.map((f) => dockerComponent(f)),
            );
          },
          title: 'Discover components',
        },
      ],
      {
        collectErrors: 'minimal',
        exitOnError: true,
      },
    );

    const context = await this.manager.runAll();

    this.manager.add(
      [
        {
          task(_, task) {
            return task.newListr(
              (context.components || [])?.map((cmp) => {
                return {
                  rendererOptions: { persistentOutput: true },
                  async task(_ctx, _task) {
                    await buildDockerImage(cmp, (_prog) => {
                      // if (prog.id === 'moby.image.id') {
                      //   task.output = prog.aux.ID + '\n';
                      // }
                    });
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
