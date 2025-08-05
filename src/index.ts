import { basename } from 'node:path';
import { pathspec, simpleGit } from 'simple-git';
import Docker from 'dockerode';

export type Prerequisite = File | EnvVariable;

export interface Task {
  prerequisites?: Array<Prerequisite>;
}

export type File = {
  path: string;
};

export type EnvVariable = {
  name: string;
};

export interface DockerComponentBuild extends Task {
  name: string;
  context: string;
  dockerfile: string;
  buildArgs?: Record<string, string>;
}

const loadFilePrerequisites = async (
  component: string,
  modified = false,
): Promise<Array<File>> => {
  const repo = simpleGit('./');
  const result = await repo.status([pathspec(component)]);

  return modified
    ? result.files.filter((f) => result.modified.includes(f.path))
    : result.files.filter((f) => f.index != '?');
};

const dockerComponent = async (cpath: string) => {
  const name = basename(cpath);
  const prerequisites = await loadFilePrerequisites(cpath);

  const image: DockerComponentBuild = {
    name,
    context: cpath,
    dockerfile: 'Dockerfile',
    prerequisites,
  };

  return image;
};

// Builders

const buildDockerImage = async (cmp: DockerComponentBuild) => {
  console.log('Building image', cmp);

  const docker = new Docker();
  const files = ((cmp.prerequisites || []) as Array<File>).map((f) =>
    f.path.substring(cmp.context.length),
  );

  const stream = await docker.buildImage(
    {
      context: cmp.context,
      src: [...files],
    },
    {
      t: cmp.name,
      dockerfile: cmp.dockerfile,
    },
  );

  return new Promise((resolve, reject) => {
    docker.modem.followProgress(stream, (err, res) =>
      err ? reject(err) : resolve(res),
    );
  });
};

// Main

const main = async () => {
  const frontend = await dockerComponent('example/frontend');
  const res = await buildDockerImage(frontend);
  console.log('--->', res);
};

main();
