import { getContext } from '@';
import { ImageInfo, ListImagesOptions } from 'dockerode';

export const listImages = async (
  opts?: ListImagesOptions,
): Promise<Array<ImageInfo>> => {
  const { docker } = getContext();
  const images = await docker.listImages({
    ...opts,
  });

  return images;
};
