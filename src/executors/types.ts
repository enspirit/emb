import { Writable } from 'node:stream';

export type ExecutorRunOptions = {
  cwd?: string;
  out?: Writable;
};

export type Executor<
  RO extends ExecutorRunOptions = ExecutorRunOptions,
  T = unknown,
> = {
  run(script: string, options?: RO): Promise<T>;
};
