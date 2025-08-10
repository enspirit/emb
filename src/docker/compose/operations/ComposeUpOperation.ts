import { getContext } from '@';
import { Listr } from 'listr2';
import { Readable } from 'node:stream';
import * as z from 'zod';

import { ExecuteLocalCommandOperation } from '@/monorepo';
import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/cli/docker/compose/up/
 */
const schema = z
  .object({
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

    const command = ['docker', 'compose', 'up', '-d'];
    if (input?.forceRecreate) {
      command.push('--force-recreate');
    }

    const task = new Listr({
      rendererOptions: { persistentOutput: true },
      async task() {
        return monorepo.run(new ExecuteLocalCommandOperation(), {
          script: command.join(' '),
          workingDir: monorepo.rootDir,
        });
      },
      title: 'Starting project',
    });

    await task.run();
  }
}
