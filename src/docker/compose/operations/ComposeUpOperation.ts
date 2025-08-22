import { getContext } from '@';
import * as z from 'zod';

import { ExecuteLocalCommandOperation } from '@/monorepo';
import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/cli/docker/compose/up/
 */
const schema = z
  .object({
    components: z
      .array(z.string())
      .optional()
      .describe('The list of service to up'),
    forceRecreate: z
      .boolean()
      .optional()
      .describe(
        "Recreate containers even if their configuration and image haven't changed",
      ),
  })
  .optional();

export class ComposeUpOperation extends AbstractOperation<typeof schema, void> {
  constructor() {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<void> {
    const { monorepo } = getContext();
    const manager = monorepo.taskManager();

    const command = ['docker', 'compose', 'up', '-d'];

    if (input?.components) {
      command.push(...input.components);
    }

    if (input?.forceRecreate) {
      command.push('--force-recreate');
    }

    manager.add([
      {
        async task(ctx, task) {
          return monorepo.run(new ExecuteLocalCommandOperation(task.stdout()), {
            script: command.join(' '),
            workingDir: monorepo.rootDir,
          });
        },
        title: 'Starting project',
      },
    ]);

    await manager.runAll();
  }
}
