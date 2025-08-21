import { Component, IResourceBuilder, Monorepo, ResourceInfo } from '@';

export type ResourceBuildContext<I> = {
  // The full info of the resource, incuding their params
  config: ResourceInfo<I>;
  //
  component: Component;
  monorepo: Monorepo;
};

export type ResourceBuilderConstructor<I, O, R> = new (
  context: ResourceBuildContext<I>,
) => IResourceBuilder<I, O, R>;

export class ResourceFactory {
  protected static types: Record<
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ResourceBuilderConstructor<any, any, any>
  > = {};

  static register<I, O, R>(
    type: string,
    constructor: ResourceBuilderConstructor<I, O, R>,
  ) {
    if (this.types[type]) {
      throw new Error(`Resource type \`${type}\` already registered`);
    }

    this.types[type] = constructor;
  }

  static factor<I, O, R>(
    type: string,
    context: ResourceBuildContext<I>,
  ): IResourceBuilder<I, O, R> {
    const BuilderClass = this.types[type];

    if (!BuilderClass) {
      throw new Error(
        `Unknown resource type \`${type}\` (${context.config.id})`,
      );
    }

    return new BuilderClass(context);
  }
}
