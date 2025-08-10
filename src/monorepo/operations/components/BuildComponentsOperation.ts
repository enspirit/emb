import { getContext } from '@';
import { Manager } from '@listr2/manager';
import { createColors } from 'colorette';
import {
  DefaultRenderer,
  delay,
  ListrDefaultRendererLogLevels,
  ListrTask,
  ListrTaskWrapper,
  PRESET_TIMER,
  SimpleRenderer,
} from 'listr2';
import * as z from 'zod';

import {
  BuildImageOperation,
  DockerComponentBuild,
  getSentinelFile,
} from '@/docker/index.js';
import { Component } from '@/monorepo/component.js';
import { EMBCollection, findRunOrder } from '@/monorepo/utils/findRunOrder.js';
import { AbstractOperation } from '@/operations';
import { FilePrerequisitePlugin } from '@/prerequisites/FilePrerequisitePlugin.js';
import { PrerequisiteType } from '@/prerequisites/types.js';

type BuildComponentContext = {
  build: DockerComponentBuild;
  parentTask: ListrTaskWrapper<
    unknown,
    typeof DefaultRenderer,
    typeof SimpleRenderer
  >;
  plugin: FilePrerequisitePlugin;
  preBuildMeta?: string;
  sentinelFile: string;
  // if we detect a cache hit, the rest of the tasks can skip
  skip?: boolean;
};

const schema = z.object({
  components: z
    .array(z.string())
    .describe('The list of components to build')
    .optional(),
});

export class BuildComponentsOperation extends AbstractOperation<
  typeof schema,
  Array<unknown>
> {
  constructor() {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<Array<unknown>> {
    const { monorepo } = getContext();
    const selection = (input.components || []).map((t) =>
      monorepo.component(t),
    );

    const collection = new EMBCollection(this.context.monorepo.components, {
      idField: 'name',
      depField: 'dependencies',
      forbidIdNameCollision: true,
    });

    const ordered = findRunOrder(
      selection.map((s) => s.name),
      collection,
    );

    const tasks: Array<ListrTask> = await Promise.all(
      ordered.map((cmp) => {
        return {
          task: async (context, task) => {
            return this.buildComponent(cmp, task);
          },
          title: `Building ${cmp.name}`,
        };
      }),
    );

    const manager = new Manager({
      collectErrors: 'minimal',
      concurrent: false,
      exitOnError: true,
      rendererOptions: {
        collapseErrors: false,
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

    manager.add([
      {
        async task(_context, task) {
          return task.newListr([...tasks], {
            rendererOptions: {
              collapseSubtasks: false,
            },
          });
        },
        title: 'Building components',
      },
    ]);

    await manager.runAll();

    return ordered;
  }

  private async buildComponent(
    cmp: Component,
    parentTask: ListrTaskWrapper<
      unknown,
      typeof DefaultRenderer,
      typeof SimpleRenderer
    >,
  ) {
    return parentTask.newListr<BuildComponentContext>(
      [
        // Collect all the prerequisites and other build infos
        // (This is when variables are expanded etc)
        {
          async task(ctx) {
            // Reset the context to defaults (as apparently the context is shared amongst branches??)
            // TODO understand and fix
            ctx.skip = false;
            //
            ctx.parentTask = parentTask;
            ctx.sentinelFile = getSentinelFile(cmp);
            ctx.plugin = new FilePrerequisitePlugin();
            ctx.build = await cmp.toDockerBuild();
          },
          title: 'Prepare build context',
        },
        // Check for sentinal information to see if the build can be skipped
        {
          task: async (ctx) => {
            ctx.preBuildMeta = await ctx.plugin.meta(
              cmp,
              ctx.build.prerequisites,
              'pre',
            );

            let lastValue: string | undefined;
            try {
              lastValue = (
                await this.context.monorepo.store.readFile(ctx.sentinelFile)
              ).toString();
            } catch {
              lastValue = undefined;
            }

            if (lastValue) {
              const diff = await ctx.plugin.diff(
                cmp,
                ctx.build.prerequisites,
                lastValue,
                ctx.preBuildMeta,
              );

              if (!diff) {
                ctx.skip = true;
                ctx.parentTask.skip(`${ctx.parentTask.title} (cache hit)`);
              }
            }
          },
          title: 'Checking prerequisites',
        },
        {
          task: async (ctx, task) => {
            if (ctx.skip) {
              return task.skip();
            }

            await delay(500);

            const title = `Building image ${ctx.build.name}:${ctx.build.tag}`;
            task.title = title;

            const op = new BuildImageOperation((progress) => {
              task.title = progress;
            });

            await this.context.monorepo.run(op, {
              ...ctx.build,
              src: ctx.build.prerequisites
                .filter((p) => {
                  return p.type === PrerequisiteType.file;
                })
                .map((p) => p.path),
              tag: ctx.build.name + ':' + ctx.build.tag,
            });

            // Restore title
            task.title = title;
          },
          title: 'Building image',
        },
        // Update sentinel file
        {
          task: async (ctx, task) => {
            if (ctx.skip) {
              return task.skip();
            }

            const sentinelValue = await ctx.plugin.meta(
              cmp,
              ctx.build.prerequisites,
              'post',
            );

            await this.context.monorepo.store.writeFile(
              ctx.sentinelFile,
              sentinelValue,
            );
          },
          title: 'Dumping cache info',
        },
      ],
      {
        rendererOptions: {
          collapseSubtasks: true,
        },
      },
    );
  }
}
