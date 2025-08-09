import { FilePrerequisite } from '@/prerequisites';

export type EnvVariable = {
  name: string;
};

export interface DockerComponentBuild {
  buildArgs?: Record<string, string>;
  context: string;
  dockerfile: string;
  labels?: Record<string, string>;
  name: string;
  prerequisites: Array<FilePrerequisite>;
  tag: string;
  target?: string;
}
