import { getContext } from '@';
import { ListrTask } from 'listr2';
import { Writable } from 'node:stream';

import { ContainerExecOperation } from '@/docker';
import {
  EMBCollection,
  findRunOrder,
  TaskInfo,
  taskManagerFactory,
} from '@/monorepo';
import { IOperation } from '@/operations';

import {
  ExecuteLocalCommandOperation,
  GetComponentContainerOperation,
} from '../index.js';

export enum ExecutorType {
  container = 'container',
  local = 'local',
}

export type RunTasksOperationParams = {
  tasks: Array<string>;
  executor?: ExecutorType | undefined;
  allMatching?: boolean;
};

export type TaskWithScript = TaskInfo & { script: string };
export class RunTasksOperation
  implements IOperation<RunTasksOperationParams, Array<TaskInfo>>
{
  async run(params: RunTasksOperationParams): Promise<Array<TaskInfo>> {
    const { monorepo } = getContext();

    // First ensure the selection is valid (user can use task IDs or names)
    const collection = new EMBCollection(monorepo.tasks, {
      idField: 'id',
      depField: 'pre',
    });

    const ordered = findRunOrder(params.tasks, collection, {
      onAmbiguous: params.allMatching ? 'runAll' : 'error',
    });

    const manager = taskManagerFactory();

    manager.add(
      ordered.map((task) => {
        return {
          rendererOptions: {
            persistentOutput: true,
          },
          task: async (context, listrTask) => {
            if (!task.script) {
              return;
            }

            const executor =
              params.executor ??
              (task.component ? ExecutorType.container : ExecutorType.local);

            if (executor === ExecutorType.container && !task.component) {
              throw new Error(
                'Cannot use the container executor with global tasks',
              );
            }

            switch (executor) {
              case ExecutorType.container: {
                return this.runDocker(
                  task as TaskWithScript,
                  listrTask.stdout(),
                );
              }

              case ExecutorType.local: {
                return this.runLocal(task as TaskWithScript);
              }

              default: {
                throw new Error(`Unssuported executor type: ${executor}`);
              }
            }
          },
          title: `Running ${task.id}`,
        };
      }) as Array<ListrTask>,
    );

    await manager.runAll();

    return ordered;
  }

  protected async runDocker(task: TaskWithScript, out?: Writable) {
    const { monorepo } = getContext();

    const containerInfo = await monorepo.run(
      new GetComponentContainerOperation(),
      task.component,
    );

    return monorepo.run(new ContainerExecOperation(out), {
      attachStderr: true,
      attachStdout: true,
      container: containerInfo.Id,
      script: task.script,
    });
  }

  protected async runLocal(task: TaskWithScript) {
    const { monorepo } = getContext();

    const cwd = task.component
      ? monorepo.component(task.component).rootdir
      : monorepo.rootDir;

    return monorepo.run(new ExecuteLocalCommandOperation(), {
      script: task.script,
      workingDir: cwd,
    });
  }
}
