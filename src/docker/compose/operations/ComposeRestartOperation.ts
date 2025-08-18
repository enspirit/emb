import { getContext } from '@';
import * as z from 'zod';

import { ExecuteLocalCommandOperation, taskManagerFactory } from '@/monorepo';
import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/cli/docker/compose/restart/
 */
const schema = z
  .object({
    services: z
      .array(z.string())
      .optional()
      .describe('The list of service to restart'),
    noDeps: z.boolean().optional().describe("Don't restart dependent services"),
  })
  .optional();

export class ComposeRestartOperation extends AbstractOperation<
  typeof schema,
  void
> {
  constructor() {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<void> {
    const { monorepo } = getContext();
    const manager = taskManagerFactory();

    const command = ['docker', 'compose', 'restart'];

    if (input?.services) {
      command.push(...input.services);
    }

    if (input?.noDeps) {
      command.push('--no-deps');
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
          ? `Restarting ${input.services.join(', ')}`
          : 'Restarting project',
      },
    ]);

    await manager.runAll();
  }
}
