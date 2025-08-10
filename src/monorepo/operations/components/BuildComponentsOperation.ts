import { getContext } from '@';
import {
  DefaultRenderer,
  ListrTask,
  ListrTaskWrapper,
  SimpleRenderer,
} from 'listr2';
import * as z from 'zod';

import {
  BuildImageOperation,
  DockerComponentBuild,
  getSentinelFile,
} from '@/docker';
import {
  Component,
  EMBCollection,
  findRunOrder,
  taskManagerFactory,
} from '@/monorepo';
import { AbstractOperation } from '@/operations';
import { FilePrerequisitePlugin, PrerequisiteType } from '@/prerequisites';

export type BuildComponentMeta = {
  // if we running dryMode, we keep going through to collect meta info
  dryRun?: boolean;
  // if we detect a cache hit, the rest of the tasks can skip
  cacheHit?: boolean;
  build: DockerComponentBuild;
  preBuildMeta?: string;
  sentinelFile: string;
};

const schema = z.object({
  components: z
    .array(z.string())
    .describe('The list of components to build')
    .optional(),
  dryRun: z
    .boolean()
    .optional()
    .describe(
      'Do not build but return the config that would be used to build the images',
    ),
  silent: z
    .boolean()
    .optional()
    .describe('Do not produce any output on the terminal'),
});

export class BuildComponentsOperation extends AbstractOperation<
  typeof schema,
  Record<string, BuildComponentMeta>
> {
  constructor() {
    super(schema);
  }

  protected async _run(
    input: z.input<typeof schema>,
  ): Promise<Record<string, BuildComponentMeta>> {
    const { monorepo } = getContext();
    const manager = taskManagerFactory<Record<string, BuildComponentMeta>>();

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
            return this.buildComponent(cmp, task, context, input.dryRun);
          },
          title: `Building ${cmp.name}`,
        };
      }),
    );

    const list = manager.newListr([...tasks], {
      renderer: input.silent ? 'silent' : 'default',
      rendererOptions: { persistentOutput: true },
      ctx: {} as Record<string, BuildComponentMeta>,
    });

    const results = await list.run();

    return results;
  }

  private async buildComponent(
    cmp: Component,
    parentTask: ListrTaskWrapper<
      unknown,
      typeof DefaultRenderer,
      typeof SimpleRenderer
    >,
    parentContext: Record<string, BuildComponentMeta>,
    dryRun: boolean = false,
  ) {
    const prereqPlugin = new FilePrerequisitePlugin();

    const list = parentTask.newListr<BuildComponentMeta>(
      [
        // Collect all the prerequisites and other build infos
        // (This is when variables are expanded etc)
        {
          async task(ctx) {
            // Install the context for this specific component build chain
            ctx.cacheHit = false;
            ctx.sentinelFile = getSentinelFile(cmp);
            ctx.build = await cmp.toDockerBuild();
          },
          title: 'Prepare build context',
        },
        // Check for sentinal information to see if the build can be skipped
        {
          task: async (ctx) => {
            ctx.preBuildMeta = await prereqPlugin.meta(
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
              const diff = await prereqPlugin.diff(
                cmp,
                ctx.build.prerequisites,
                lastValue,
                ctx.preBuildMeta,
              );

              if (!diff) {
                ctx.cacheHit = true;
                parentTask.skip(`${parentTask.title} (cache hit)`);
              }
            }
          },
          title: 'Checking prerequisites',
        },
        {
          task: async (ctx, task) => {
            if (ctx.cacheHit || ctx.dryRun) {
              return task.skip();
            }

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
            if (ctx.cacheHit || ctx.dryRun) {
              return task.skip();
            }

            const sentinelValue = await prereqPlugin.meta(
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
        {
          // Return build meta data
          async task(ctx) {
            parentContext[cmp.name] = ctx;

            if (ctx.dryRun) {
              parentTask.skip(`${parentTask.title} (dry run)`);
            }
          },
        },
      ],
      {
        ctx: { dryRun } as BuildComponentMeta,
      },
    );

    return list;
  }
}
