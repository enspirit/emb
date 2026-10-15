import * as z from 'zod';

import { getContext } from '@/context.js';
import { ExecuteLocalCommandOperation } from '@/monorepo';
import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/cli/docker/compose/down/
 */
const schema = z
  .object({
    services: z
      .array(z.string())
      .optional()
      .describe('The list of services to stop and remove'),
    volumes: z
      .boolean()
      .optional()
      .describe(
        'Remove named volumes declared in the compose file and anonymous volumes attached to containers',
      ),
    removeOrphans: z
      .boolean()
      .optional()
      .describe(
        'Remove containers for services not defined in the compose file',
      ),
  })
  .optional();

/**
 * Build the `docker compose down` command line for the given input.
 */
export const composeDownCommand = (
  input: z.input<typeof schema>,
): Array<string> => {
  return [
    'docker',
    'compose',
    'down',
    ...(input?.volumes ? ['--volumes'] : []),
    ...(input?.removeOrphans ? ['--remove-orphans'] : []),
    ...(input?.services || []),
  ];
};

export class ComposeDownOperation extends AbstractOperation<
  typeof schema,
  void
> {
  constructor() {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<void> {
    const { monorepo } = getContext();
    const manager = monorepo.taskManager();

    const command = composeDownCommand(input);

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
