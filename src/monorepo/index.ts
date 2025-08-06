import Docker from 'dockerode';
import { basename } from 'node:path';
import { simpleGit } from 'simple-git';

export type Prerequisite = EnvVariable | File;

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
  buildArgs?: Record<string, string>;
  context: string;
  dockerfile: string;
  name: string;
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
    context: cpath,
    dockerfile: 'Dockerfile',
    name,
    prerequisites,
  };

  return image;
};

// Builders
type MobyTrace = { aux: unknown; error?: string; id: string };

const buildDockerImage = async (
  cmp: DockerComponentBuild,
  progress?: (trace: MobyTrace) => void,
): Promise<DockerComponentBuild & { traces: Array<MobyTrace> }> => {
  const docker = new Docker();
  const files = ((cmp.prerequisites || []) as Array<File>).map((f) =>
    f.path.slice(cmp.context.length),
  );

  const stream = await docker.buildImage(
    {
      context: cmp.context,
      src: [...files],
    },
    {
      buildargs: cmp.buildArgs,
      dockerfile: cmp.dockerfile,
      t: cmp.name,
      target: cmp.target,
      version: '2',
    },
  );

  return new Promise((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err, traces) => {
        return err ? reject(err) : resolve({ ...cmp, traces });
      },
      (trace: MobyTrace) => {
        if (trace.error) {
          reject(new Error(trace.error));
        } else {
          progress?.(trace);
        }
      },
    );
  });
};

// Main

import { Manager } from '@listr2/manager';
import { ListrLogger, ListrLogLevels } from 'listr2';

import { discoverComponents } from './discovery.js';

export type BuildOptions = {
  concurreny?: number;
  failfast?: boolean;
};

interface Ctx {
  components?: Array<DockerComponentBuild>;
  injected?: boolean;
  runTime?: number;
}

class ImageBuilder {
  private logger = new ListrLogger({ useIcons: false });
  private manager: Manager<Ctx>;
  private options: BuildOptions;

  constructor(options?: BuildOptions) {
    this.options = {
      concurreny: 1,
      failfast: false,
      ...options,
    };

    this.manager = new Manager({
      collectErrors: 'minimal',
      concurrent: false,
      exitOnError: true,
      rendererOptions: {
        collapseErrors: false,
        collapseSkips: false,
        collapseSubtasks: false,
      },
    });
  }

  public async run(): Promise<void> {
    this.manager.add(
      [
        {
          async task(ctx) {
            const folders = await discoverComponents();
            ctx.components = await Promise.all(
              folders.map((f) => dockerComponent(f)),
            );
          },
          title: 'Discover components',
        },
      ],
      {
        collectErrors: 'minimal',
        exitOnError: true,
      },
    );

    const context = await this.manager.runAll();

    this.manager.add(
      [
        {
          task(_, task) {
            return task.newListr(
              (context.components || [])?.map((cmp) => {
                return {
                  rendererOptions: { persistentOutput: true },
                  async task(_ctx, _task) {
                    await buildDockerImage(cmp, (_prog) => {
                      // if (prog.id === 'moby.image.id') {
                      //   task.output = prog.aux.ID + '\n';
                      // }
                    });
                  },
                  title: `Build ${cmp.name}`,
                };
              }),
            );
          },
          title: 'Build components',
        },
      ],
      {
        concurrent: this.options.concurreny,
        exitOnError: this.options.failfast,
        rendererOptions: { collapseSubtasks: false },
      },
    );

    try {
      await this.manager.runAll();

      if (this.manager.errors.length > 0) {
        throw new Error('Build failed');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.log(ListrLogLevels.FAILED, error.message);
      } else {
        this.logger.log(ListrLogLevels.FAILED, error as string);
      }
    }
  }
}

export const build = async (options?: BuildOptions) => {
  await new ImageBuilder(options).run();
};
