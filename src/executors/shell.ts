import { execa } from 'execa';

import { Executor, ExecutorRunOptions } from './types.js';

export const shellExecutor: Executor = {
  async run(script: string, options: ExecutorRunOptions) {
    const process = execa(script, {
      all: true,
      cwd: options.cwd,
      shell: true,
    });

    if (options.out) {
      process.all?.pipe(options.out);
    }

    return process;
  },
};
