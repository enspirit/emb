import { PruneContainersInfo } from 'dockerode';

import { getContext } from '../../cli/context.js';

// For some reason it's not typed in dockerode
export type PruneContainersOptions = {
  label?: Array<string>;
};

export const pruneContainers = async (
  opts?: PruneContainersOptions,
): Promise<PruneContainersInfo> => {
  const { docker } = getContext();
  const info = await docker.pruneContainers({
    ...opts,
  });

  return info;
};
