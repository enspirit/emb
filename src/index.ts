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
  target?: string;
}

const loadFilePrerequisites = async (
  component: string,
): Promise<Array<File>> => {
  const repo = simpleGit('./');
  return (await repo.raw('ls-files', component))
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((path) => {
      return { path };
    });

  return [];
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
      buildargs: cmp.buildArgs,
      target: cmp.target,
    },
  );

  return new Promise((resolve, reject) => {
    docker.modem.followProgress(stream, (err, res) => {
      return err ? reject(err) : resolve(res);
    });
  });
};

// Main

const main = async () => {
  const frontend = await dockerComponent('example/frontend');
  const images = [];

  images.push(
    buildDockerImage({
      ...frontend,
      name: 'frontend-dev',
      target: 'dev',
    }),
  );

  images.push(
    buildDockerImage({
      ...frontend,
      name: 'frontend-production',
      target: 'production',
    }),
  );

  console.log(await Promise.all(images));
};

main();
