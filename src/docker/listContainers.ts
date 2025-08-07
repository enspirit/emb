import Docker, { ContainerInfo, ContainerListOptions } from 'dockerode';

const docker = new Docker();

export const listContainers = async (
  opts?: ContainerListOptions,
): Promise<Array<ContainerInfo>> => {
  const containers = await docker.listContainers({
    ...opts,
  });

  return containers;
};
