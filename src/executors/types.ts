import { ChildProcess } from 'node:child_process';

export type ExecutorRunOptions = {
  cwd?: string;
};
export type Executor = {
  run(script: string, options?: ExecutorRunOptions): Promise<ChildProcess>;
};
