import { Writable } from 'node:stream';

import {
  CreateFileOperation,
  IResourceBuilder,
  ResourceInfo,
} from '@/monorepo';
import { OpInput, OpOutput } from '@/operations/index.js';

import { ResourceBuildContext, ResourceFactory } from './ResourceFactory.js';

export class FileResourceBuilder
  implements
    IResourceBuilder<
      OpInput<CreateFileOperation>,
      OpOutput<CreateFileOperation>,
      void
    >
{
  constructor(
    protected context: ResourceBuildContext<OpInput<CreateFileOperation>>,
  ) {}

  async build(
    resource: ResourceInfo<OpInput<CreateFileOperation>>,
    out?: Writable,
  ) {
    const input: OpInput<CreateFileOperation> = {
      path: this.context.component.join(resource.params?.path || resource.name),
    };

    return {
      input,
      operation: new CreateFileOperation(out),
    };
  }
}

// Bring better abstraction and register as part of the plugin initialization
ResourceFactory.register('file', FileResourceBuilder);
