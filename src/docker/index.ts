import type { File } from '../git/index.js';

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
