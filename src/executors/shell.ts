import { execa } from 'execa';
import { ChildProcess } from 'node:child_process';

import { Executor, ExecutorRunOptions } from './types.js';

export const shellExecutor: Executor = {
  async run(script: string, options: ExecutorRunOptions) {
    return execa(script, {
      all: true,
      cwd: options.cwd,
      shell: true,
      stderr: ['pipe'],
      stdout: ['pipe'],
    }) as ChildProcess;
  },
};
