import { relative } from 'node:path';
import { simpleGit } from 'simple-git';

export type File = {
  path: string;
};

export const loadFilePrerequisites = async (
  component: string,
): Promise<Array<File>> => {
  const repo = simpleGit('./');

  return (await repo.raw('ls-files', component))
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((path) => {
      return { path: relative(component, path) };
    });
};
