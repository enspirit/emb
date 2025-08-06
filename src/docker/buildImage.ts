import Docker from 'dockerode';

import { File } from '../git/index.js';
import { DockerComponentBuild } from './index.js';

export type MobyTrace = { aux: unknown; error?: string; id: string };

export const buildDockerImage = async (
  cmp: DockerComponentBuild,
  progress?: (trace: MobyTrace) => void,
): Promise<DockerComponentBuild & { traces: Array<MobyTrace> }> => {
  const docker = new Docker();
  const files = ((cmp.prerequisites || []) as Array<File>).map((f) =>
    f.path.slice(cmp.context.length),
  );

  console.log('GONNA BUILD', cmp.context, files, cmp.dockerfile);

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
      (trace: MobyTrace) => {
        if (trace.error) {
          reject(new Error(trace.error));
        } else {
          progress?.(trace);
        }
      },
    );
  });
};
