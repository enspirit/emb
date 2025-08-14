import { CreateFileOperation } from '@/monorepo';
import { OpInput } from '@/operations/index.js';

import { ResourceFactory } from './ResourceFactory.js';

// Bring better abstraction and register as part of the plugin initialization
ResourceFactory.register('file', async ({ config, component }) => {
  return {
    async build() {
      const fromConfig = (config.params || {}) as Partial<
        OpInput<CreateFileOperation>
      >;

      const input: OpInput<CreateFileOperation> = {
        path: component.join(fromConfig?.path || config.name),
      };

      return {
        input,
        operation: new CreateFileOperation(),
      };
    },
  };
});
