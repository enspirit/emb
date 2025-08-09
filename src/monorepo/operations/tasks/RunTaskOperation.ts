import { getContext } from '@';
import { Writable } from 'node:stream';

import { ContainerExecOperation } from '@/docker/index.js';
import { TaskInfo } from '@/monorepo/types.js';
import { IOperation } from '@/operations/types.js';

import {
  ExecuteLocalCommandOperation,
  GetComponentContainerOperation,
} from '../index.js';

export enum ExecutorType {
  container = 'container',
  local = 'local',
}

export type RunTaskOperationParams = {
  executor: ExecutorType;
  task: TaskInfo;
};

export class RunTaskOperation
  implements IOperation<RunTaskOperationParams, void>
{
  constructor(protected out?: Writable) {}

  async run(params: RunTaskOperationParams): Promise<void> {
    switch (params.executor) {
      case ExecutorType.container: {
        return this.runDocker(params);
      }

      case ExecutorType.local: {
        return this.runLocal(params);
      }

      default: {
        throw new Error(`Unsupported executor type: ${params.executor}`);
      }
    }
  }

  private async runDocker(params: RunTaskOperationParams) {
    const { monorepo } = getContext();

    if (!params.task.component) {
      throw new Error(`Support for non-component tasks not implemented`);
    }

    const containerInfo = await monorepo.run(
      new GetComponentContainerOperation(),
      params.task.component,
    );

    await monorepo.run(new ContainerExecOperation(this.out), {
      attachStderr: true,
      attachStdout: true,
      container: containerInfo.Id,
      script: params.task.script,
    });
  }

  private async runLocal(params: RunTaskOperationParams) {
    const { monorepo } = getContext();

    const cwd = params.task.component
      ? monorepo.component(params.task.component).rootdir
      : monorepo.rootDir;

    await monorepo.run(new ExecuteLocalCommandOperation(this.out), {
      script: params.task.script,
      workingDir: cwd,
    });
  }
}
