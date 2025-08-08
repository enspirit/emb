import { ContainerInfo, ContainerListOptions } from 'dockerode';

import { getContext } from '../../cli/context.js';

export const listContainers = async (
  opts?: ContainerListOptions,
): Promise<Array<ContainerInfo>> => {
  const { docker } = getContext();
  const containers = await docker.listContainers({
    ...opts,
  });

  return containers;
};
