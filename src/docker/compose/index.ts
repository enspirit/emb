import { getContext } from '@';
import { spawn } from 'node:child_process';

export type DockerComposeOptions = {
  cwd?: string;
};

export type UpOptions = DockerComposeOptions & {};

export const up = async (opts?: UpOptions) => {
  const { monorepo } = await getContext();

  return spawn('docker', ['compose', 'up', '-d'], {
    cwd: opts?.cwd,
    env: monorepo.env,
  });
};

export type DownOptions = DockerComposeOptions & {};

export const down = async (opts?: UpOptions) => {
  const { monorepo } = await getContext();

  return spawn('docker', ['compose', 'down'], {
    cwd: opts?.cwd,
    env: monorepo.env,
  });
};
