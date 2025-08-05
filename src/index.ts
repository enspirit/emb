import { basename } from 'node:path';
import { simpleGit } from 'simple-git';
import Docker from 'dockerode';

export type Prerequisite = File | EnvVariable;

export interface Task {
  prerequisites?: Array<Prerequisite>;
}

export type File = {
  path: string;
};

export type EnvVariable = {
  name: string;
};

export interface DockerComponentBuild extends Task {
  name: string;
  context: string;
  dockerfile: string;
  buildArgs?: Record<string, string>;
  target?: string;
}

const loadFilePrerequisites = async (
  component: string,
): Promise<Array<File>> => {
  const repo = simpleGit('./');
  return (await repo.raw('ls-files', component))
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((path) => {
      return { path };
    });

  return [];
};

const dockerComponent = async (cpath: string) => {
  const name = basename(cpath);
  const prerequisites = await loadFilePrerequisites(cpath);

  const image: DockerComponentBuild = {
    name,
    context: cpath,
    dockerfile: 'Dockerfile',
    prerequisites,
  };

  return image;
};

// Builders

const buildDockerImage = async (
  cmp: DockerComponentBuild,
  progress?: (status: { stream: string }) => void,
): Promise<DockerComponentBuild & { logs: unknown[] }> => {
  const docker = new Docker();
  const files = ((cmp.prerequisites || []) as Array<File>).map((f) =>
    f.path.substring(cmp.context.length),
  );

  const stream = await docker.buildImage(
    {
      context: cmp.context,
      src: [...files],
    },
    {
      t: cmp.name,
      dockerfile: cmp.dockerfile,
      buildargs: cmp.buildArgs,
      target: cmp.target,
    },
  );

  return new Promise((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err, logs) => {
        return err ? reject(err) : resolve({ ...cmp, logs });
      },
      (obj) => {
        progress?.(obj);
      },
    );
  });
};

// Main

import { Manager } from '@listr2/manager';

import type { ListrBaseClassOptions } from 'listr2';
import { ListrLogger } from 'listr2';

function TaskManagerFactory<T = any>(
  override?: ListrBaseClassOptions,
): Manager<T> {
  return new Manager({
    concurrent: false,
    exitOnError: true,
    rendererOptions: {
      collapseSubtasks: false,
      collapseSkips: false,
    },
    ...override,
  });
}

interface Ctx {
  injected?: boolean;
  runTime?: number;
}

class MyMainClass {
  private tasks = TaskManagerFactory<Ctx>();
  private logger = new ListrLogger({ useIcons: false });

  public async run(): Promise<void> {
    const frontend = await dockerComponent('example/frontend');

    this.tasks.add(
      [
        {
          title: 'Building frontend-dev',
          task: async (ctx, task): Promise<void> => {
            await buildDockerImage(
              {
                ...frontend,
                name: 'frontend-dev',
                target: 'dev',
              },
              (progress) => {
                task.output = (task.output || '') + progress.stream + '\n';
              },
            );
          },
          rendererOptions: { persistentOutput: true },
        },
        {
          title: 'Building frontend-production',
          task: async (ctx, task): Promise<void> => {
            await buildDockerImage(
              {
                ...frontend,
                name: 'frontend-production',
                target: 'production',
              },
              (progress) => {
                task.output = (task.output || '') + progress.stream + '\n';
              },
            );
          },
          rendererOptions: { persistentOutput: true },
        },
      ],
      {
        exitOnError: true,
        concurrent: false,
      },
    );

    await this.tasks.runAll();
  }
}

await new MyMainClass().run();
