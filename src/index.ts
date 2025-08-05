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
      version: '2',
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
import { ListrLogger, ListrLogLevels } from 'listr2';

function TaskManagerFactory<T = unknown>(
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
    const frontend = await dockerComponent('frontend');

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
                if (typeof progress.stream !== 'string') {
                  return;
                }
                task.output = (task.output || '') + progress.stream + '\n';
              },
            );
          },
        },
        {
          title: 'Building frontend-production',
          task: async (ctx, task): Promise<void> => {
            const res = await buildDockerImage(
              {
                ...frontend,
                name: 'frontend-production',
                target: 'production',
              },
              (progress) => {
                if (typeof progress.stream !== 'string') {
                  return;
                }
                task.output = (task.output || '') + progress.stream + '\n';
              },
            );
            task.output = res.logs
              .map((r) => (r as { stream?: string }).stream)
              .filter(Boolean)
              .join('\n');
          },
        },
      ],
      {
        exitOnError: true,
        concurrent: false,
      },
    );

    this.logger.log(ListrLogLevels.STARTED, 'Building all docker images.');

    try {
      await this.tasks.runAll();
    } catch (err: any) {
      this.logger.log(ListrLogLevels.FAILED, err);
    }
  }
}

await new MyMainClass().run();
