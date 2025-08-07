import Docker, { PruneContainersInfo } from 'dockerode';

const docker = new Docker();

// For some reason it's not typed in dockerode
export type PruneContainersOptions = {
  label?: Array<string>;
};

export const pruneContainers = async (
  opts?: PruneContainersOptions,
): Promise<PruneContainersInfo> => {
  const info = await docker.pruneContainers({
    ...opts,
  });

  return info;
};
