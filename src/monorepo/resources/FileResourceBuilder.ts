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

  async getReference(): Promise<string> {
    return this.context.component.relative(
      this.context.config.params?.path || this.context.config.name,
    );
  }

  async build(
    resource: ResourceInfo<OpInput<CreateFileOperation>>,
    out?: Writable,
  ) {
    const input: OpInput<CreateFileOperation> = {
      path: await this.context.component.join(
        this.context.config.params?.path || this.context.config.name,
      ),
    };

    return {
      input,
      operation: new CreateFileOperation(out),
    };
  }
}

// Bring better abstraction and register as part of the plugin initialization
ResourceFactory.register('file', FileResourceBuilder);
