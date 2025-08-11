import { beforeEach, describe, expect, test } from 'vitest';
import * as z from 'zod';

import { AbstractOperation } from '@/operations';

describe('Operations / AbstractOperation', () => {
  const inputSchema = z.object({
    firstname: z.string(),
    lastname: z.string().optional(),
  });

  class GreetOperation extends AbstractOperation<typeof inputSchema, string> {
    constructor() {
      super(inputSchema);
    }

    protected async _run(input: z.infer<typeof inputSchema>): Promise<string> {
      return input.lastname
        ? input.firstname + ' ' + input.lastname
        : input.firstname;
    }
  }

  describe('#run()', () => {
    let operation: GreetOperation;

    beforeEach(() => {
      operation = new GreetOperation();
    });

    test('it rejects on invalid input', async () => {
      await expect(operation.run({})).rejects.toThrowError(z.ZodError);

      await expect(operation.run({})).rejects.toThrowError(/Invalid input/);
    });

    test('it resolves on valid input', async () => {
      await expect(
        operation.run({
          firstname: 'John',
        }),
      ).resolves.toEqual('John');

      await expect(
        operation.run({
          firstname: 'John',
          lastname: 'Doe',
        }),
      ).resolves.toEqual('John Doe');
    });
  });
});
