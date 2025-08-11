import { simpleGit } from 'simple-git';

import { Component } from '@/monorepo';

import {
  FilePrerequisite,
  PrerequisitePlugin,
  PrerequisiteType,
} from './types.js';

export class GitPrerequisitePlugin
  implements PrerequisitePlugin<PrerequisiteType.file, FilePrerequisite>
{
  async collect(component: Component): Promise<Array<FilePrerequisite>> {
    const repo = simpleGit(component.rootDir);

    return (await repo.raw('ls-files', component.rootDir))
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((path) => {
        return {
          path,
          type: PrerequisiteType.file,
        };
      });
  }
}
