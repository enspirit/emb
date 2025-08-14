import {
  DefaultRenderer,
  ListrTask,
  ListrTaskWrapper,
  SimpleRenderer,
} from 'listr2';
import * as z from 'zod';

import {
  EMBCollection,
  findRunOrder,
  ResourceInfo,
  taskManagerFactory,
} from '@/monorepo';
import {
  ResourceBuilderInfo,
  ResourceFactory,
  SentinelData,
} from '@/monorepo/resources/ResourceFactory.js';
import { AbstractOperation } from '@/operations';

export type BuildResourceMeta = {
  // if we running dryMode, we keep going through to collect meta info
  dryRun?: boolean;
  force?: boolean;
  // the resource to build
  resource?: ResourceInfo;
  // input of the operation (for debugging purposes)
  builder?: ResourceBuilderInfo<unknown, unknown>;
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
  constructor() {
    super(schema);
  }

  protected async _run(
    input: z.input<typeof schema>,
  ): Promise<Record<string, BuildResourceMeta>> {
    const { monorepo } = this.context;
    const manager = taskManagerFactory<Record<string, BuildResourceMeta>>();

    const collection = new EMBCollection(monorepo.resources, {
      idField: 'id',
      depField: 'dependencies',
      forbidIdNameCollision: true,
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
              const previousSentinelData =
                await this.readSentinelFile(resource);
              ctx.sentinelData =
                await ctx.builder.mustBuild(previousSentinelData);

              ctx.cacheHit = !ctx.sentinelData;
            }
          },
        },
        {
          title: `Build image for ${resource.id}`,
          async task(ctx, task) {
            const skip = (prefix: string) => {
              parentTask.title = `${prefix} ${resource.id}`;
              task.skip();
              return parentTask.skip();
            };

            if (ctx.cacheHit && !ctx.force && !ctx.dryRun) {
              return skip('[cache hit]');
            }

            const { input, operation } = await ctx.builder!.build();
            ctx.builderInput = input;

            if (ctx.dryRun) {
              return skip('[dry run]');
            }

            return operation.run(ctx.builderInput!);
          },
        },
        {
          // Return build meta data and dump
          // cache data into sentinel file
          task: async (ctx) => {
            if (ctx.builder) {
              delete ctx.builder;
            }

            //
            parentContext[resource.id] = ctx;

            if (ctx.sentinelData && !ctx.dryRun) {
              await this.storeSentinelData(resource, ctx.sentinelData);
            }
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

  private sentinelFilePath(resource: ResourceInfo): string {
    const { monorepo } = this.context;
    return `sentinels/flavors/${monorepo.currentFlavor}/${resource.component}/${resource.name}.built`;
  }

  private async storeSentinelData(resource: ResourceInfo, data: unknown) {
    await this.context.monorepo.store.writeFile(
      this.sentinelFilePath(resource),
      JSON.stringify(data),
    );
  }

  private async readSentinelFile(
    resource: ResourceInfo,
  ): Promise<SentinelData<unknown> | undefined> {
    const path = this.sentinelFilePath(resource);
    const stats = await this.context.monorepo.store.stat(path, false);
    if (!stats) {
      return undefined;
    }

    const data = await this.context.monorepo.store.readFile(path, false);
    return {
      data,
      mtime: stats.mtime.getTime(),
    };
  }
}
