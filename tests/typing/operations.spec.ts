import { Monorepo } from '@';
import { describe, it } from 'vitest';
import { default as z } from 'zod';

import { IOperation } from '@/operations/types.js';

import { AbstractOperation } from '../../src/operations/index.js';
import { CompleteExample } from '../fixtures/complete-example.js';

const myZodSchema = z.object({
  name: z.string(),
  age: z.number().optional(),
});
class MyZodBasedOperation extends AbstractOperation<
  typeof myZodSchema,
  string
> {
  constructor() {
    super(myZodSchema);
  }

  protected async _run(_input: {
    name: string;
    age?: number | undefined;
  }): Promise<string> {
    return 'ok';
  }
}

describe('The TS typing around Operations', () => {
  const runner = new Monorepo(CompleteExample, '/tmp');

  it('works as expected for IOperation base type', () => {
    // ----------- VALID

    // @ts-check
    const _myStringOp: IOperation<string, string> = {
      async run(_input: string): Promise<string> {
        return 'ok';
      },
    };

    // ----------- INVALID

    const _invalidOutput: IOperation<string, string> = {
      async run(_input: string): Promise<string> {
        // @ts-expect-error wrong operation output
        return 42;
      },
    };

    const _invalidInput: IOperation<string, string> = {
      // @ts-expect-error wrong operation output
      async run(_input: number): Promise<string> {
        return 'ok';
      },
    };

    const _missingPromise: IOperation<string, string> = {
      run(_input: string): Promise<string> {
        // @ts-expect-error wrong operation output
        return 'ok';
      },
    };
  });

  describe('Monorepo#run', () => {
    it('works as expected with base type IOperation', async () => {
      const stringOp: IOperation<string, string> = {
        async run(_string: string): Promise<string> {
          return 'ok';
        },
      };

      const noParamsOp: IOperation<void, string> = {
        async run(): Promise<string> {
          return 'ok';
        },
      };

      // ------------- VALID

      // Simplest example
      let _str: string = await runner.run(stringOp, 'ok');

      // We support operation that have no input
      _str = await runner.run(noParamsOp);

      // ------------- INVALID

      // @ts-expect-error invalid input type
      await runner.run(stringOp, 42);
      // @ts-expect-error invalid input type
      runner.run(stringOp, {});
      // @ts-expect-error invalid input type
      runner.run(stringOp);

      // @ts-expect-error invalid output type assignment
      const _number: number = await runner.run(stringOp, 'foo');
      // @ts-expect-error invalid input type
      const _obj: { name: string } = runner.run(stringOp, {});
      // @ts-expect-error invalid input type
      const _null: null = await runner.run(stringOp);
    });

    it('works as expected with AbstractOperation classes', () => {
      // VALID
      runner.run(new MyZodBasedOperation(), {
        name: 'foo',
      });
      runner.run(new MyZodBasedOperation(), {
        name: 'foo',
        age: 42,
      });

      // INVALID

      // @ts-expect-error missing input
      runner.run(new MyZodBasedOperation()).catch(() => {});

      runner
        .run(new MyZodBasedOperation(), {
          name: 'foo',
          // @ts-expect-error wrong type
          age: '42',
        })
        .catch(() => {});

      runner.run(new MyZodBasedOperation(), {
        name: 'foo',
        // @ts-expect-error extra prop
        lastname: 'bar',
      });
    });
  });
});
