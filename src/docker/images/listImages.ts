import { ImageInfo, ListImagesOptions } from 'dockerode';

import { getContext } from '../../cli/context.js';

export const listImages = async (
  opts?: ListImagesOptions,
): Promise<Array<ImageInfo>> => {
  const { docker } = getContext();
  const images = await docker.listImages({
    ...opts,
  });

  return images;
};
