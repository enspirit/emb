import { Writable } from 'node:stream';

import { getContext } from '@/cli';

import { DockerComponentBuild } from '../index.js';
import { decode } from '../protobuf/index.js';

export type MobyTrace = { aux: unknown; error?: string; id: string };
export type Progress = { error?: string; name?: string };
export type DockerBuildExtraOptions = {
  output?: Writable;
};

export const buildDockerImage = async (
  cmp: DockerComponentBuild,
  opts: DockerBuildExtraOptions = {},
  progress?: (progress: Progress) => void,
): Promise<DockerComponentBuild & { traces: Array<MobyTrace> }> => {
  const files = (cmp.prerequisites || []).map((f) => f.path);
  const { docker } = getContext();

  const stream = await docker.buildImage(
    {
      context: cmp.context,
      src: [...files],
    },
    {
      buildargs: cmp.buildArgs,
      dockerfile: cmp.dockerfile,
      labels: cmp.labels,
      t: cmp.name + ':' + (cmp.tag || 'latest'),
      target: cmp.target,
      version: '2',
    },
  );

  if (opts.output) {
    stream.pipe(opts.output);
  }

  return new Promise((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err, traces) => {
        return err ? reject(err) : resolve({ ...cmp, traces });
      },
      async (trace: MobyTrace) => {
        if (trace.error) {
          reject(new Error(trace.error));
        } else {
          try {
            const { vertexes } = await decode(trace.aux as string);
            vertexes.forEach((v: { name: string }) => {
              progress?.(v);
            });
          } catch (error) {
            console.error(error);
          }
        }
      },
    );
  });
};
