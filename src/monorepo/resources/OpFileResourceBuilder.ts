import { mkdir, statfs } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Writable } from 'node:stream';
import * as z from 'zod';

import { getContext } from '@/context.js';
import { IResourceBuilder, ResourceInfo } from '@/monorepo';
import { AbstractOperation, OpInput, OpOutput } from '@/operations';
import { OnePasswordProvider } from '@/secrets/providers/OnePasswordProvider.js';

import { ResourceBuildContext, ResourceFactory } from './ResourceFactory.js';

const schema = z.object({
  reference: z
    .string()
    .describe('Full 1Password secret reference, e.g. op://vault/item/file'),
  path: z.string().describe('Absolute path where the file should be written'),
});

export class FetchOpFileOperation extends AbstractOperation<
  typeof schema,
  unknown
> {
  constructor(protected out?: Writable) {
    super(schema);
  }

  protected async _run(input: z.input<typeof schema>): Promise<void> {
    const context = getContext();
    const provider = context?.secrets?.get('op') as
      | OnePasswordProvider
      | undefined;

    if (!provider) {
      throw new Error(
        "1Password plugin is not registered. Add it to your .emb.yml: plugins: [{ name: 'op' }]",
      );
    }

    await mkdir(dirname(input.path), { recursive: true });
    await provider.fetchFileAttachment(input.reference, input.path);
  }
}

export class OpFileResourceBuilder implements IResourceBuilder<
  OpInput<FetchOpFileOperation>,
  OpOutput<FetchOpFileOperation>,
  boolean
> {
  constructor(
    protected context: ResourceBuildContext<OpInput<FetchOpFileOperation>>,
  ) {}

  private get relPath(): string {
    return this.context.config.params?.path || this.context.config.name;
  }

  async getReference(): Promise<string> {
    return this.context.component.relative(this.relPath);
  }

  async getPath() {
    return this.context.component.join(this.relPath);
  }

  async mustBuild() {
    try {
      await statfs(await this.getPath());
    } catch {
      return true;
    }
  }

  async build(
    resource: ResourceInfo<OpInput<FetchOpFileOperation>>,
    out?: Writable,
  ) {
    if (!resource.params?.reference) {
      throw new Error(
        `Resource '${resource.id}' (type op/file) requires a 'reference' param, e.g. op://vault/item/file`,
      );
    }

    const input: OpInput<FetchOpFileOperation> = {
      reference: resource.params.reference,
      path: await this.getPath(),
    };

    return {
      input,
      operation: new FetchOpFileOperation(out),
    };
  }
}

ResourceFactory.register('op/file', OpFileResourceBuilder);
