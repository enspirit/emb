import { Container } from 'dockerode';

import { Executor, ExecutorRunOptions } from './types.js';

export type DockerExecutorRunOptions = ExecutorRunOptions & {
  container: Container;
};

export const dockerExecutor: Executor<DockerExecutorRunOptions> = {
  async run(script: string, options: DockerExecutorRunOptions) {
    const exec = await options.container.exec({
      AttachStderr: true,
      AttachStdout: true,
      Cmd: ['bash', '-c', script],
    });

    const stream = await exec.start({});

    if (options.out) {
      options.container.modem.demuxStream(stream, options.out, options.out);
    }

    return stream;
  },
};
