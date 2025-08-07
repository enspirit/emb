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
  labels?: Record<string, string>;
  name: string;
  tag?: string;
  target?: string;
}

export * from './buildImage.js';
export * from './ImageBuilder.js';
export * from './listImages.js';
