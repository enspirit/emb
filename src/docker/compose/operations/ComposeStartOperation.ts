import { getContext } from '@';
import * as z from 'zod';

import { ExecuteLocalCommandOperation, taskManagerFactory } from '@/monorepo';
import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/cli/docker/compose/start/
 */
const schema = z
  .object({
    services: z
      .array(z.string())
      .optional()
      .describe('The list of service to start'),
  })
  .optional();

export class ComposeStartOperation extends AbstractOperation<
  typeof schema,
  void
> {
  constructor() {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<void> {
    const { monorepo } = getContext();
    const manager = taskManagerFactory();

    const command = ['docker', 'compose', 'start'];

    if (input?.services) {
      command.push(...input.services);
    }

    manager.add([
      {
        async task(ctx, task) {
          return monorepo.run(new ExecuteLocalCommandOperation(task.stdout()), {
            script: command.join(' '),
            workingDir: monorepo.rootDir,
          });
        },
        title: input?.services
          ? `Starting ${input.services.join(', ')}`
          : 'Starting project',
      },
    ]);

    await manager.runAll();
  }
}
