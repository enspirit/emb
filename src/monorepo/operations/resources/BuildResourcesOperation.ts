import {
  DefaultRenderer,
  ListrTask,
  ListrTaskWrapper,
  PRESET_TIMER,
  SimpleRenderer,
} from 'listr2';
import * as z from 'zod';

import {
  EMBCollection,
  findRunOrder,
  IResourceBuilder,
  ResourceFactory,
  ResourceInfo,
} from '@/monorepo';
import { AbstractOperation } from '@/operations';

export type BuildResourceMeta = {
  // if we running dryMode, we keep going through to collect meta info
  dryRun?: boolean;
  force?: boolean;
  // the resource to build
  resource?: ResourceInfo;
  // input of the operation (for debugging purposes)
  builder?: IResourceBuilder<unknown, unknown, unknown>;
  builderInput?: unknown;
  // cache data to build into sentinel file
  sentinelData?: unknown;
  cacheHit?: boolean;
};

const schema = z.object({
  resources: z
    .array(z.string())
    .describe('The list of resources to build')
    .optional(),
  dryRun: z
    .boolean()
    .optional()
    .describe(
      'Do not build but return the config that would be used to build the resources',
    ),
  silent: z
    .boolean()
    .optional()
    .describe('Do not produce any output on the terminal'),
  force: z
    .boolean()
    .optional()
    .describe('Bypass the cache and force the build'),
});

export class BuildResourcesOperation extends AbstractOperation<
  typeof schema,
  Record<string, BuildResourceMeta>
> {
  // keep track of what has been built
  // to ensure depedencies cannot ignore their turn
  private built: Array<ResourceInfo> = [];

  constructor() {
    super(schema);
  }

  protected async _run(
    input: z.input<typeof schema>,
  ): Promise<Record<string, BuildResourceMeta>> {
    const { monorepo } = this.context;
    const manager = monorepo.taskManager();

    const collection = new EMBCollection(monorepo.resources, {
      idField: 'id',
      depField: 'dependencies',
    });

    const ordered = findRunOrder(input.resources || [], collection);

    const tasks: Array<ListrTask> = ordered.map((resource) => {
      return {
        task: async (context, task) => {
          return this.buildResource(resource, task, context, {
            dryRun: input.dryRun,
            force: input.force,
          });
        },
        title: `Building ${resource.id}`,
      };
    });

    return manager.run(
      [
        {
          title: 'Build resources',
          async task(ctx, task) {
            return task.newListr(tasks, {
              rendererOptions: {
                collapseSubtasks: false,
                collapseSkips: true,
              },
            });
          },
        },
      ],
      {
        silentRendererCondition() {
          return Boolean(input.silent);
        },
        rendererOptions: {
          collapseSkips: true,
          collapseSubtasks: true,
          timer: {
            ...PRESET_TIMER,
          },
        },
        ctx: {} as Record<string, BuildResourceMeta>,
      },
    );
  }

  private async buildResource(
    resource: ResourceInfo,
    parentTask: ListrTaskWrapper<
      unknown,
      typeof DefaultRenderer,
      typeof SimpleRenderer
    >,
    parentContext: Record<string, BuildResourceMeta>,
    options?: {
      dryRun?: boolean;
      force?: boolean;
    },
  ) {
    const list = parentTask.newListr<BuildResourceMeta>(
      [
        {
          title: 'Prepare build context',
          task: async (ctx) => {
            // Extend the context for this specific resource build chain
            Object.assign(ctx, options, { resource });

            const { monorepo } = this.context;
            ctx.builder = await ResourceFactory.factor(resource.type, {
              monorepo,
              config: resource,
              component: monorepo.component(resource.component),
            });
          },
        },
        // Actual build
        {
          title: `Checking cache for ${resource.id}`,
          /** Skip the build if the builder knows it can be skipped */
          task: async (ctx) => {
            if (ctx.builder?.mustBuild) {
              ctx.sentinelData = await ctx.builder.mustBuild(ctx.resource!);
              ctx.cacheHit = !ctx.sentinelData;

              // If one of our dependency was built, we force the re-build
              // despite the cache-hit
              const found = ctx.resource!.dependencies?.find((d) =>
                Boolean(this.built.find((r) => r.id === d)),
              );
              ctx.force = ctx.force || Boolean(found);
            }
          },
        },
        {
          rendererOptions: { persistentOutput: true },
          title: `Build ${resource.id}`,
          task: async (ctx, task) => {
            const skip = (prefix: string) => {
              parentTask.title = `${prefix} ${resource.id}`;
              task.skip();
              return parentTask.skip();
            };

            if (ctx.cacheHit && !ctx.force && !ctx.dryRun) {
              return skip('[cache hit]');
            }

            const { input, operation } = await ctx.builder!.build(
              ctx.resource!,
              task.stdout(),
            );
            ctx.builderInput = input;

            this.built.push(ctx.resource!);

            if (ctx.dryRun) {
              return skip('[dry run]');
            }

            const output = await operation.run(ctx.builderInput!);

            if (ctx.sentinelData) {
              ctx.builder!.commit?.(ctx.resource!, output, ctx.sentinelData);
            }

            return output;
          },
        },
        {
          // Return build meta data and dump
          // cache data into sentinel file
          async task(ctx) {
            if (ctx.builder) {
              delete ctx.builder;
            }

            //
            parentContext[resource.id] = ctx;
          },
        },
      ],
      {
        ctx: {
          ...options,
        } as BuildResourceMeta,
        rendererOptions: {
          collapseSubtasks: true,
        },
      },
    );

    return list;
  }
}
