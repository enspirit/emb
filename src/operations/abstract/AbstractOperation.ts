import { EmbContext, getContext } from '@';
import * as z from 'zod';

import { IOperation } from '@/operations';

export type OpInput<A extends AbstractOperation<z.Schema, unknown>> =
  A extends AbstractOperation<infer I, unknown> ? z.infer<I> : never;

export type OpOutput<A extends AbstractOperation<z.Schema, unknown>> =
  A extends AbstractOperation<z.Schema, infer O> ? O : never;

export abstract class AbstractOperation<S extends z.Schema, O = unknown>
  implements IOperation<z.infer<S>, O>
{
  protected context: EmbContext;

  constructor(protected inputSchema: S) {
    if (!inputSchema) {
      throw new Error(
        `${this.constructor.name} does not call super() with validation schema`,
      );
    }

    this.context = getContext();
  }

  protected abstract _run(input: z.infer<S>): Promise<O>;

  async run(input: unknown | z.infer<S>): Promise<O> {
    const dressed = this.inputSchema.parse(input);

    return this._run(dressed);
  }
}
