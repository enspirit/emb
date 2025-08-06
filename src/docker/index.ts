import Docker from 'dockerode';
import { basename } from 'node:path';

import type { File } from '../git/index.js';

import { loadFilePrerequisites } from '../git/index.js';

export type Prerequisite = EnvVariable | File;

export type EnvVariable = {
  name: string;
};

export interface Task {
  prerequisites?: Array<Prerequisite>;
}

export interface DockerComponentBuild extends Task {
  buildArgs?: Record<string, string>;
  context: string;
  dockerfile: string;
  name: string;
  target?: string;
}

// Builders
type MobyTrace = { aux: unknown; error?: string; id: string };

export const dockerComponent = async (cpath: string) => {
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

export const buildDockerImage = async (
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
