import { ResourceInfo } from '@';
import { Writable } from 'node:stream';

import { IOperation } from '@/operations/types.js';

export type IResourceBuilder<Input, Output, Reason> = {
  /**
   * Returns a string representing the resource to build
   * Eg. the full name of a docker image (repo/imgname:tag)
   * Eg. a file path
   */
  getReference(): Promise<string>;

  /**
   * Returns input and operation required to actually
   * build the resources.
   * This allows the dry-run mechanism to be implemented outside
   * resource implementations
   *
   * @param resource The resource config
   * @param out The Writable to use to write logs
   */
  build(
    resource: ResourceInfo<Input>,
    out?: Writable,
  ): Promise<{
    input: Input;
    operation: IOperation<Input, Output>;
  }>;

  // The contract is simple
  // The resource implementation has the opportunity to compare whatever it knows
  // with the mtime of the sentinel (= timestamp of last successful build)
  // or even its content (use it to store json for your own logic).
  // and then return 'undefined' if the resource does not need rebuilding
  // If you return anything else, we will run the operation and then
  // write the data provided into the sentinel file (JSON.stringified)
  mustBuild?: (resource: ResourceInfo<Input>) => Promise<Reason | undefined>;

  /**
   * Resource builders will be informed when a successful build of resource
   * has been produced through them
   *
   * This allows them to store metadata to improve their caching algorithm
   */
  commit?: (
    resource: ResourceInfo<Input>,
    output: Output,
    reason: Reason,
  ) => Promise<void>;

  /**
   * Similar to .build(), must return input and operation required to actually
   * publish the resources.
   * This allows the dry-run mechanism to be implemented outside
   * resource implementations
   *
   * @param resource The resource config
   * @param out The Writable to use to write logs
   */
  publish?(resource: ResourceInfo<Input>, out?: Writable): Promise<void>;
};
