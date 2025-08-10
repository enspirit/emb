import { getContext } from '@';
import { Readable } from 'node:stream';
import * as z from 'zod';

import { ExecuteLocalCommandOperation } from '@/monorepo';
import { AbstractOperation } from '@/operations';

/**
 * https://docs.docker.com/reference/cli/docker/compose/down/
 */
const schema = z.object({}).optional();

export class ComposeDownOperation extends AbstractOperation<
  typeof schema,
  Readable
> {
  constructor() {
    super(schema);
  }

  protected async _run(_input: z.input<typeof schema>): Promise<Readable> {
    const { monorepo } = getContext();

    const command = ['docker', 'compose', 'down'];

    return monorepo.run(new ExecuteLocalCommandOperation(), {
      script: command.join(' '),
      workingDir: monorepo.rootDir,
    });
  }
}
