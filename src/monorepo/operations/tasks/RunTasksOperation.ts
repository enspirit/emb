import { getContext } from '@';
import { ListrTask } from 'listr2';
import { PassThrough, Writable } from 'node:stream';

import { ContainerExecOperation, ListContainersOperation } from '@/docker';
import {
  EMBCollection,
  findRunOrder,
  TaskInfo,
  taskManagerFactory,
} from '@/monorepo';
import { IOperation } from '@/operations';

import { ExecuteLocalCommandOperation } from '../index.js';

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
export type TaskWithScriptAndComponent = TaskInfo & {
  script: string;
  component: string;
};

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

            const tee = new PassThrough();
            const logFile = await monorepo.store.createWriteStream(
              `logs/tasks/${task.id}.logs`,
            );
            tee.pipe(listrTask.stdout());
            tee.pipe(logFile);

            switch (executor) {
              case ExecutorType.container: {
                return this.runDocker(task as TaskWithScriptAndComponent, tee);
              }

              case ExecutorType.local: {
                return this.runLocal(task as TaskWithScript, tee);
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

  protected async runDocker(task: TaskWithScriptAndComponent, out?: Writable) {
    const { monorepo } = getContext();

    const containers = await monorepo.run(new ListContainersOperation(), {
      filters: {
        label: [
          `emb/project=${monorepo.name}`,
          `emb/component=${task.component}`,
        ],
      },
    });

    if (containers.length === 0) {
      throw new Error(`No container found for component \`${task.component}\``);
    }

    if (containers.length > 1) {
      throw new Error(
        `More than one container found for component \`${task.component}\``,
      );
    }

    return monorepo.run(new ContainerExecOperation(out), {
      container: containers[0].Id,
      script: task.script,
      env: await monorepo.expand(task.vars || {}),
    });
  }

  protected async runLocal(task: TaskWithScript, out: Writable) {
    const { monorepo } = getContext();

    const cwd = task.component
      ? monorepo.join(monorepo.component(task.component).rootDir)
      : monorepo.rootDir;

    return monorepo.run(new ExecuteLocalCommandOperation(out), {
      script: task.script,
      workingDir: cwd,
      env: await monorepo.expand(task.vars || {}),
    });
  }
}
