import { getContext, setContext } from '@';
import { Command, Flags, Interfaces } from '@oclif/core';
import { JsonPatchError } from 'fast-json-patch';

import { BaseCommand } from './BaseCommand.js';

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<
  (typeof FlavoredCommand)['baseFlags'] & T['flags']
>;
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>;

export abstract class FlavoredCommand<
  T extends typeof Command,
> extends BaseCommand {
  // define flags that can be inherited by any command that extends FlavoredCommand
  static baseFlags = {
    ...super.baseFlags,
    flavor: Flags.string({
      description: 'Specify the flavor to use.',
      name: 'flavor',
      required: false,
    }),
  };
  // add the --json flag
  static enableJsonFlag = true;
  protected args!: Args<T>;
  protected flags!: Flags<T>;

  protected async catch(err: Error & { exitCode?: number }): Promise<void> {
    if (err instanceof JsonPatchError) {
      this.log('INVALID', err.operation);
      this.error('Invalid patch detected while applying flavor', {
        code: err.name,
        message: `Path \`${err.operation?.path}\``,
      });
      return;
    }

    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    return super.catch(err);
  }

  public async init(): Promise<void> {
    await super.init();

    const { args, flags } = await this.parse({
      args: this.ctor.args,
      baseFlags: (super.ctor as typeof FlavoredCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      flags: this.ctor.flags,
      strict: this.ctor.strict,
    });

    this.flags = flags as Flags<T>;
    this.args = args as Args<T>;

    // Get monorepo config
    const context = getContext();

    // Installing flavor if relevant
    // no validation as the monorepo will
    // complain properly if incorrect
    const { flavor } = this.flags;
    if (flavor) {
      this.context = setContext({
        ...context,
        monorepo: await context.monorepo.withFlavor(flavor),
      });
    }
  }
}
