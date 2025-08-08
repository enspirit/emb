import { IProjectConfig } from '@/config';

export class ProjectConfig implements IProjectConfig {
  name: string;
  rootDir: string;

  constructor(config: IProjectConfig) {
    this.name = config.name;
    this.rootDir = config.rootDir;
  }
}
