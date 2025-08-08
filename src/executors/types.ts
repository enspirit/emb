import { Writable } from 'node:stream';

export type ExecutorRunOptions = {
  cwd?: string;
  out?: Writable;
};

export type Executor<T = unknown> = {
  run(script: string, options?: ExecutorRunOptions): Promise<T>;
};
