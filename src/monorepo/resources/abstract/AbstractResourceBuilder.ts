import { ResourceInfo } from '@';
import { Writable } from 'node:stream';

import { IOperation } from '@/operations/types.js';

import { ResourceBuildContext } from '../ResourceFactory.js';
import { IResourceBuilder } from '../types.js';

export abstract class AbstractResourceBuilder<I, O, R>
  implements IResourceBuilder<I, O, R>
{
  constructor(protected context: ResourceBuildContext<I>) {}

  abstract _build(
    resource: ResourceInfo<I>,
    out?: Writable,
  ): Promise<{ input: I; operation: IOperation<I, O> }>;

  build(
    resource: ResourceInfo<I>,
    out?: Writable,
  ): Promise<{ input: I; operation: IOperation<I, O> }> {
    return this._build(resource, out);
  }

  abstract _mustBuild?(
    resource: ResourceInfo<I>,
  ): Promise<R | undefined> | undefined;

  async mustBuild(resource: ResourceInfo<I>) {
    return this._mustBuild?.(resource);
  }

  _publish?(resource: ResourceInfo<I>, out?: Writable): Promise<void>;

  async publish?(resource: ResourceInfo<I>, out?: Writable): Promise<void> {
    return this._publish?.(resource, out);
  }

  abstract _commit(
    resource: ResourceInfo<I>,
    output: O,
    reason: R,
  ): Promise<void>;

  async commit(resource: ResourceInfo<I>, output: O, reason: R) {
    return this._commit?.(resource, output, reason);
  }
}
