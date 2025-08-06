import type { File } from '../git/index.js';

export type Prerequisite = File;

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
