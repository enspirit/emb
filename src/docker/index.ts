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
