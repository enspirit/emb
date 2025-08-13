import { simpleGit } from 'simple-git';

import {
  FilePrerequisite,
  PrerequisitePlugin,
  PrerequisiteType,
} from './types.js';

export class GitPrerequisitePlugin
  implements PrerequisitePlugin<PrerequisiteType.file, FilePrerequisite>
{
  async collect(path: string): Promise<Array<FilePrerequisite>> {
    const repo = simpleGit(path);

    return (await repo.raw('ls-files', path))
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
