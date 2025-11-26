import { getContext } from '@';
import * as z from 'zod';

import { ExecuteLocalCommandOperation } from '@/monorepo';
import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/cli/docker/compose/ps/
 */
const schema = z
  .object({
    all: z.boolean().optional().describe('Sow all stopped containers'),
  })
  .optional();

export class ComposePsOperation extends AbstractOperation<typeof schema, void> {
  constructor() {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<void> {
    const { monorepo } = getContext();

    const command = ['docker', 'compose', 'ps'];

    if (input?.all) {
      command.push('--all');
    }

    monorepo.setTaskRenderer('silent');

    const manager = monorepo.taskManager();
    manager.add([
      {
        async task() {
          return monorepo.run(new ExecuteLocalCommandOperation(), {
            script: command.join(' '),
            workingDir: monorepo.rootDir,
          });
        },
        title: 'Listing running containers',
      },
    ]);

    await manager.runAll();
  }
}
