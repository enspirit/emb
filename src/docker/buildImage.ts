import Docker from 'dockerode';

import { DockerComponentBuild } from './index.js';
import { decode } from './protobuf/index.js';

export type MobyTrace = { aux: unknown; error?: string; id: string };
export type Progress = { error?: string; name?: string };

export const buildDockerImage = async (
  cmp: DockerComponentBuild,
  progress?: (progress: Progress) => void,
): Promise<DockerComponentBuild & { traces: Array<MobyTrace> }> => {
  const docker = new Docker();
  const files = (cmp.prerequisites || []).map((f) => f.path);

  const stream = await docker.buildImage(
    {
      context: cmp.context,
      src: [...files],
    },
    {
      buildargs: cmp.buildArgs,
      dockerfile: cmp.dockerfile,
      t: cmp.name,
      target: cmp.target,
      version: '2',
    },
  );

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
