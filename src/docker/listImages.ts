import Docker, { ImageInfo, ListImagesOptions } from 'dockerode';

const docker = new Docker();

export const listImages = async (
  opts?: ListImagesOptions,
): Promise<Array<ImageInfo>> => {
  const images = await docker.listImages(opts);

  return images;
};
