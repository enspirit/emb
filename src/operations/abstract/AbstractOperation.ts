import { EmbContext, getContext } from '@';
import * as z from 'zod';

import { IOperation } from '@/operations';

export abstract class AbstractOperation<S extends z.Schema, O = unknown>
  implements IOperation<z.infer<S>, O>
{
  protected context: EmbContext;

  constructor(protected inputSchema: S) {
    this.context = getContext();
  }

  protected abstract _run(input: z.infer<S>): Promise<O>;

  async run(input: z.infer<S>): Promise<O> {
    const dressed = this.inputSchema.parse(input);

    return this._run(dressed);
  }
}
