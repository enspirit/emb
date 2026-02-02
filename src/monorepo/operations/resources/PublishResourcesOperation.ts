import { ListrTask, PRESET_TIMER } from 'listr2';
import * as z from 'zod';

import { CliError } from '@/errors.js';
import {
  EMBCollection,
  findRunOrder,
  ResourceFactory,
  ResourceInfo,
} from '@/monorepo';
import { AbstractOperation } from '@/operations';

const schema = z.object({
  resources: z
    .array(z.string())
    .describe('The list of resources to publish')
    .optional(),
  dryRun: z
    .boolean()
    .optional()
    .describe('Do not publish, just show what would be published'),
  silent: z
    .boolean()
    .optional()
    .describe('Do not produce any output on the terminal'),
});

export type PublishResourceMeta = {
  resource: ResourceInfo;
  reference: string;
  skipped?: boolean;
  skipReason?: string;
};

export class PublishResourcesOperation extends AbstractOperation<
  typeof schema,
  Record<string, PublishResourceMeta>
> {
  constructor() {
    super(schema);
  }

  protected async _run(
    input: z.input<typeof schema>,
  ): Promise<Record<string, PublishResourceMeta>> {
    const { monorepo } = this.context;
    const manager = monorepo.taskManager();

    // Filter to only publishable resources (publish: true)
    const publishableResources = monorepo.resources.filter(
      (r) => r.publish === true,
    );

    // Return early if no publishable resources
    if (publishableResources.length === 0) {
      return {};
    }

    // If specific resources requested, filter to those
    let targetResources: ResourceInfo[];
    if (input.resources && input.resources.length > 0) {
      const collection = new EMBCollection(publishableResources, {
        idField: 'id',
        depField: 'dependencies',
      });
      targetResources = findRunOrder(input.resources, collection);
    } else {
      // All publishable resources
      const collection = new EMBCollection(publishableResources, {
        idField: 'id',
        depField: 'dependencies',
      });
      targetResources = findRunOrder(
        publishableResources.map((r) => r.id),
        collection,
      );
    }

    // Verify each resource's builder supports publish
    for (const resource of targetResources) {
      const component = monorepo.component(resource.component);
      const builder = ResourceFactory.factor(resource.type, {
        config: resource,
        monorepo,
        component,
      });

      if (typeof builder.publish !== 'function') {
        throw new CliError(
          'PUBLISH_NOT_SUPPORTED',
          `Resource "${resource.id}" has publish: true but resource type "${resource.type}" does not support publishing.`,
          [
            `Remove "publish: true" from the resource configuration`,
            `Use a different resource type that supports publishing (e.g., docker/image)`,
          ],
        );
      }
    }

    const tasks: Array<ListrTask> = targetResources.map((resource) => {
      return {
        title: `Publish ${resource.id}`,
        async task(ctx, task) {
          const component = monorepo.component(resource.component);
          const builder = ResourceFactory.factor(resource.type, {
            config: resource,
            monorepo,
            component,
          });

          const reference = await builder.getReference();

          ctx[resource.id] = {
            resource,
            reference,
          };

          if (input.dryRun) {
            ctx[resource.id].skipped = true;
            ctx[resource.id].skipReason = 'dry run';
            task.title = `[dry run] ${resource.id} → ${reference}`;
            return task.skip();
          }

          task.title = `Publishing ${resource.id} → ${reference}`;
          await builder.publish!(resource, task.stdout());
        },
      };
    });

    if (tasks.length === 0) {
      return {};
    }

    return manager.run(
      [
        {
          title: 'Publish resources',
          async task(_ctx, task) {
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
        ctx: {} as Record<string, PublishResourceMeta>,
      },
    );
  }
}
