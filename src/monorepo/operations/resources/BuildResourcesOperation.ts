import {
  DefaultRenderer,
  ListrTask,
  ListrTaskWrapper,
  PRESET_TIMER,
  SimpleRenderer,
} from 'listr2';
import * as z from 'zod';

import { CliError } from '@/errors.js';
import {
  EMBCollection,
  findRunGraph,
  IResourceBuilder,
  resolveBuildConcurrency,
  ResourceFactory,
  ResourceInfo,
  runGraph,
  RunGraphResult,
} from '@/monorepo';
import { AbstractOperation } from '@/operations';

import { formatRebuildDecision } from '../../../docker/resources/formatRebuildDecision.js';

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

interface Deferred<T> {
  promise: Promise<T>;
  reject: (error?: unknown) => void;
  resolve: (value: T) => void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
};

type GateSignal = { reason: string; skip: true } | { skip: false };

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
  jobs: z
    .union([z.number(), z.literal('auto')])
    .optional()
    .describe('Maximum resources to build in parallel (a number or "auto")'),
  keepGoing: z
    .boolean()
    .optional()
    .describe('Keep building independent resources after a failure'),
});

export class BuildResourcesOperation extends AbstractOperation<
  typeof schema,
  Record<string, BuildResourceMeta>
> {
  // Ids of resources that were actually (re)built this run, so dependents
  // cannot ignore their turn (dependency-forced rebuild cascade).
  private built = new Set<string>();

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

    const { nodes, dependencies } = findRunGraph(
      input.resources || [],
      collection,
    );

    const concurrency = resolveBuildConcurrency({
      jobs: input.jobs,
      configured: monorepo.config.defaults?.build?.concurrency,
    });
    const keepGoing = Boolean(input.keepGoing);

    const parentContext: Record<string, BuildResourceMeta> = {};
    // Per-resource bridge between the scheduler (runGraph) and listr rendering.
    const gates = new Map<string, Deferred<GateSignal>>();
    const builds = new Map<string, Deferred<BuildResourceMeta>>();
    for (const resource of nodes) {
      gates.set(resource.id, deferred<GateSignal>());
      builds.set(resource.id, deferred<BuildResourceMeta>());
    }

    // One listr task per resource. It shows a "waiting" note, then blocks on its
    // gate until the scheduler grants it a turn (dependencies done + a free
    // slot), then runs the normal build sub-tree — or skips if a dependency
    // failed.
    const tasks: Array<ListrTask> = nodes.map((resource) => ({
      task: async (_context, task) => {
        const deps = dependencies.get(resource.id) ?? [];
        if (deps.length > 0) {
          task.output = `Waiting for ${deps.join(', ')}`;
        }

        const signal = await gates.get(resource.id)!.promise;
        if (signal.skip) {
          builds.get(resource.id)!.resolve({ resource });
          return task.skip(signal.reason);
        }

        task.output = '';
        return this.buildResource(resource, task, parentContext, {
          buildDone: builds.get(resource.id)!,
          dryRun: input.dryRun,
          force: input.force,
        });
      },
      title: `Building ${resource.id}`,
    }));

    // The scheduler drives execution; the worker opens a resource's gate and
    // awaits its build outcome.
    const worker = (id: string): Promise<BuildResourceMeta> => {
      gates.get(id)!.resolve({ skip: false });
      return builds.get(id)!.promise;
    };

    const onSettle = (
      id: string,
      result: RunGraphResult<BuildResourceMeta>,
    ) => {
      if (result.status === 'skipped') {
        const reason =
          result.reason === 'aborted'
            ? 'stopped after an earlier failure'
            : `dependency ${result.reason} failed`;
        gates.get(id)!.resolve({ reason, skip: true });
      }
    };

    // Start rendering (all tasks begin and block on their gates), then let the
    // scheduler open the gates; finally wait for both to settle.
    const listrDone = manager.run(
      [
        {
          title: 'Build resources',
          async task(_ctx, task) {
            return task.newListr(tasks, {
              concurrent: true,
              exitOnError: false,
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
          timer: { ...PRESET_TIMER },
        },
        ctx: {} as Record<string, BuildResourceMeta>,
      },
    );

    const results = await runGraph(
      nodes.map((resource) => resource.id),
      (id) => dependencies.get(id) ?? [],
      worker,
      { concurrency, keepGoing, onSettle },
    );

    await listrDone;

    const failed = [...results.entries()]
      .filter(([, result]) => result.status === 'failed')
      .map(([id]) => id);

    if (failed.length > 0) {
      const skippedByDependency = [...results.entries()]
        .filter(
          ([, result]) =>
            result.status === 'skipped' &&
            result.reason &&
            result.reason !== 'aborted',
        )
        .map(([id]) => id);

      const parts = [`Failed to build: ${failed.join(', ')}.`];
      if (skippedByDependency.length > 0) {
        parts.push(`Skipped dependent(s): ${skippedByDependency.join(', ')}.`);
      }

      const firstError = results.get(failed[0])?.error;
      const cause =
        firstError instanceof Error ? firstError.message : String(firstError);

      throw new CliError('BUILD_FAILED', `${parts.join(' ')} (${cause})`, [
        'Inspect the failing build output above.',
      ]);
    }

    return parentContext;
  }

  private async buildResource(
    resource: ResourceInfo,
    parentTask: ListrTaskWrapper<
      unknown,
      typeof DefaultRenderer,
      typeof SimpleRenderer
    >,
    parentContext: Record<string, BuildResourceMeta>,
    options: {
      buildDone: Deferred<BuildResourceMeta>;
      dryRun?: boolean;
      force?: boolean;
    },
  ) {
    const { buildDone, ...buildOptions } = options;
    const list = parentTask.newListr<BuildResourceMeta>(
      [
        {
          title: 'Prepare build context',
          task: async (ctx) => {
            // Extend the context for this specific resource build chain
            Object.assign(ctx, buildOptions, { resource });

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
              // despite the cache-hit. Safe under the scheduler: every
              // dependency has fully completed before we get here.
              const depBuilt = ctx.resource!.dependencies?.some((d) =>
                this.built.has(d),
              );
              ctx.force = ctx.force || Boolean(depBuilt);
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

            const decisionLines = formatRebuildDecision({
              resourceId: resource.id,
              sentinelData: ctx.sentinelData,
              cacheHit: Boolean(ctx.cacheHit),
              force: Boolean(ctx.force),
            });
            if (decisionLines.length > 0) {
              task.output = decisionLines.join('\n');
            }

            if (ctx.cacheHit && !ctx.force && !ctx.dryRun) {
              return skip('[cache hit]');
            }

            try {
              const { input, operation } = await ctx.builder!.build(
                ctx.resource!,
                task.stdout(),
              );
              ctx.builderInput = input;

              this.built.add(resource.id);

              if (ctx.dryRun) {
                return skip('[dry run]');
              }

              const output = await operation.run(ctx.builderInput!);

              if (ctx.sentinelData) {
                await ctx.builder!.commit?.(
                  ctx.resource!,
                  output,
                  ctx.sentinelData,
                );
              }

              return output;
            } catch (error) {
              buildDone.reject(error);
              throw error;
            }
          },
        },
        {
          // Return build meta data and dump
          // cache data into sentinel file
          async task(ctx) {
            if (ctx.builder) {
              delete ctx.builder;
            }

            parentContext[resource.id] = ctx;
            buildDone.resolve(ctx);
          },
        },
      ],
      {
        // A resource's own steps must run in order (prepare -> check -> build);
        // the parent list is concurrent, so pin this one to serial explicitly.
        concurrent: false,
        ctx: {
          ...buildOptions,
        } as BuildResourceMeta,
        rendererOptions: {
          collapseSubtasks: true,
        },
      },
    );

    return list;
  }
}
