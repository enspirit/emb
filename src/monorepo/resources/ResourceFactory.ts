import { Component, Monorepo, ResourceInfo } from '@';

import { IOperation } from '@/operations/types.js';

export type ResourceBuildContext = {
  // The full info of the resource, incuding their params
  config: ResourceInfo;
  //
  component: Component;
  monorepo: Monorepo;
};

export type SentinelData<T = void> = {
  // represents the timestamp of the last build
  mtime: number;
  // whatever the builder provided right before the previous successful build
  data: T;
};

export type ResourceBuilderInfo<I, O, D = unknown> = {
  build(): Promise<{
    input: I;
    operation: IOperation<I, O>;
  }>;
  // The contract is simple
  // The builder has the opportunity to compare whatever it knows
  // with the mtime of the sentinel (= timestamp of last successful build)
  // or even its content (use it to store json for your own logic).
  // and then return 'undefined' if the resource does not need rebuilding
  // If you return anything else, we will run the operation and then
  // write the data provided into the sentinel file (JSON.stringified)
  mustBuild?: (
    previousSentinelData: SentinelData<D> | undefined,
  ) => Promise<undefined | unknown>;
};

export type ResourceFactoryOutput<I, O> = Promise<ResourceBuilderInfo<I, O>>;

export type ResourceOperationFactory<I, O> = (
  context: ResourceBuildContext,
) => ResourceFactoryOutput<I, O>;

export class ResourceFactory {
  protected static types: Record<
    string,
    ResourceOperationFactory<unknown, unknown>
  > = {};

  static register<I, O>(
    type: string,
    opFactory: ResourceOperationFactory<I, O>,
  ) {
    if (this.types[type]) {
      throw new Error(`Resource type \`${type}\` already registered`);
    }

    this.types[type] = opFactory;
  }

  static factor<I, O>(
    type: string,
    context: ResourceBuildContext,
  ): ResourceFactoryOutput<I, O> {
    const opFactory = this.types[type];

    if (!opFactory) {
      throw new Error(`Unknown resource type \`${type}\``);
    }

    return opFactory(context) as ResourceFactoryOutput<I, O>;
  }
}
