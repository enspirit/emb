import { spawn } from 'node:child_process';

export type DockerComposeOptions = {
  cwd?: string;
};

export type UpOptions = DockerComposeOptions & {};

export const up = async (opts?: UpOptions) => {
  return spawn('docker', ['compose', 'up', '-d'], {
    cwd: opts?.cwd,
    env: process.env,
  });
};

export type DownOptions = DockerComposeOptions & {};

export const down = async (opts?: UpOptions) => {
  return spawn('docker', ['compose', 'down'], {
    cwd: opts?.cwd,
    env: process.env,
  });
};
