import { getContext } from '@';
import { input } from '@inquirer/prompts';
import { ListrInquirerPromptAdapter } from '@listr2/prompt-adapter-inquirer';
import { ListrTask } from 'listr2';
import { PassThrough, Writable } from 'node:stream';

import { ContainerExecOperation } from '@/docker';
import {
  GetComponentPodOperation,
  PodExecOperation,
} from '@/kubernetes/operations/index.js';
import { resolveNamespace } from '@/kubernetes/utils/index.js';
import { EMBCollection, findRunOrder, TaskInfo } from '@/monorepo';
import { IOperation } from '@/operations';

import { ExecuteLocalCommandOperation } from '../index.js';

export enum ExecutorType {
  container = 'container',
  kubernetes = 'kubernetes',
  local = 'local',
}

export type RunTasksOperationParams = {
  tasks: Array<string>;
  executor?: ExecutorType | undefined;
  allMatching?: boolean;
  verbose?: boolean;
};

export type TaskWithScript = TaskInfo & { script: string };
export type TaskWithScriptAndComponent = TaskInfo & {
  script: string;
  component: string;
};

export class RunTasksOperation implements IOperation<
  RunTasksOperationParams,
  Array<TaskInfo>
> {
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

    const hasInteractiveTasks = ordered.find((t) => t.interactive === true);
    if (hasInteractiveTasks) {
      monorepo.setTaskRenderer('silent');
    }

    const manager = monorepo.taskManager();
    await manager.run(
      ordered.map((task) => {
        return {
          rendererOptions: {
            persistentOutput: true,
          },
          task: async (context, listrTask) => {
            if (!task.script) {
              return;
            }

            const vars = await monorepo.expand(task.vars || {});

            const executor =
              params.executor ?? (await this.defaultExecutorFor(task));

            await this.ensureExecutorValid(executor, task);

            // Handle tasks that require confirmation
            if (task.confirm) {
              const expected = await monorepo.expand(
                task.confirm.expect || 'yes',
                vars,
              );

              const message = await monorepo.expand(task.confirm.message, vars);

              const res = await listrTask
                .prompt(ListrInquirerPromptAdapter)
                .run(input, {
                  message: `${message} (type '${expected}' to continue)`,
                });

              if (res !== expected) {
                throw new Error('Task canceled');
              }
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

              case ExecutorType.kubernetes: {
                return this.runKubernetes(
                  task as TaskWithScriptAndComponent,
                  tee,
                );
              }

              case ExecutorType.local: {
                return this.runLocal(task as TaskWithScript, tee);
              }

              default: {
                throw new Error(`Unsuported executor type: ${executor}`);
              }
            }
          },
          title: `Running ${task.id}`,
        };
      }) as Array<ListrTask>,
    );

    return ordered;
  }

  protected async runDocker(task: TaskWithScriptAndComponent, out?: Writable) {
    const { monorepo, compose } = getContext();

    const containerID = await compose.getContainer(task.component);
    return monorepo.run(
      new ContainerExecOperation(task.interactive ? undefined : out),
      {
        container: containerID,
        script: task.script,
        interactive: task.interactive || false,
        env: await monorepo.expand(task.vars || {}),
      },
    );
  }

  protected async runLocal(task: TaskWithScript, _out: Writable) {
    const { monorepo } = getContext();

    const cwd = task.component
      ? monorepo.join(monorepo.component(task.component).rootDir)
      : monorepo.rootDir;

    return monorepo.run(new ExecuteLocalCommandOperation(), {
      script: task.script,
      workingDir: cwd,
      interactive: task.interactive,
      env: await monorepo.expand(task.vars || {}),
    });
  }

  protected async runKubernetes(
    task: TaskWithScriptAndComponent,
    out?: Writable,
  ) {
    const { monorepo } = getContext();

    const component = monorepo.component(task.component);
    const namespace = resolveNamespace({
      config: monorepo.config.defaults?.kubernetes?.namespace,
    });

    // Resolve the pod and container for this component
    const { pod, container } = await monorepo.run(
      new GetComponentPodOperation(),
      {
        component,
        namespace,
      },
    );

    const podName = pod.metadata?.name;
    if (!podName) {
      throw new Error('Pod has no name');
    }

    return monorepo.run(
      new PodExecOperation(task.interactive ? undefined : out),
      {
        namespace,
        podName,
        container,
        script: task.script,
        interactive: task.interactive || false,
        env: await monorepo.expand(task.vars || {}),
      },
    );
  }

  private async defaultExecutorFor(task: TaskInfo): Promise<ExecutorType> {
    const available = await this.availableExecutorsFor(task);

    if (available.length === 0) {
      throw new Error('No available executor found for task');
    }

    return available[0];
  }

  private async ensureExecutorValid(executor: ExecutorType, task: TaskInfo) {
    const available = await this.availableExecutorsFor(task);
    if (!available.includes(executor)) {
      throw new Error(`Unsuported executor type: ${executor}`);
    }
  }

  private async availableExecutorsFor(
    task: TaskInfo,
  ): Promise<Array<ExecutorType>> {
    const { compose } = getContext();

    if (task.executors) {
      return task.executors as Array<ExecutorType>;
    }

    // For tasks with a component, check what executors are available
    if (task.component) {
      const available: Array<ExecutorType> = [ExecutorType.local];

      // Container executor available if component is a docker-compose service
      if (await compose.isService(task.component)) {
        available.unshift(ExecutorType.container);
      }

      // Kubernetes executor is always available for component tasks
      // (actual availability checked at runtime when --executor kubernetes is used)
      available.push(ExecutorType.kubernetes);

      return available;
    }

    return [ExecutorType.local];
  }
}
