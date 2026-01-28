import { getContext } from '@';
import * as z from 'zod';

import { ExecuteLocalCommandOperation } from '@/monorepo';
import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/cli/docker/compose/stop/
 */
const schema = z
  .object({
    services: z
      .array(z.string())
      .optional()
      .describe('The list of services to stop'),
  })
  .optional();

export class ComposeStopOperation extends AbstractOperation<
  typeof schema,
  void
> {
  constructor() {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<void> {
    const { monorepo } = getContext();
    const manager = monorepo.taskManager();

    const command = ['docker', 'compose', 'stop'];

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
          ? `Stopping ${input.services.join(', ')}`
          : 'Stopping project',
      },
    ]);

    await manager.runAll();
  }
}
