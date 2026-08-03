import { ImageInfo, ListImagesOptions } from 'dockerode';

import { getDockerClient } from '@/docker/client.js';

export const listImages = async (
  opts?: ListImagesOptions,
): Promise<Array<ImageInfo>> => {
  const docker = getDockerClient();
  const images = await docker.listImages({
    ...opts,
  });

  return images;
};
