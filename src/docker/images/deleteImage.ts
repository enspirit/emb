import { getDockerClient } from '@/docker/client.js';

export type ImageRemoveOptions = {
  force?: boolean;
  removeAnonymousVolumes?: boolean;
};

export const deleteImage = async (
  name: string,
  opts?: ImageRemoveOptions,
): Promise<unknown> => {
  const docker = getDockerClient();
  const image = await docker.getImage(name);

  return image.remove(opts);
};
