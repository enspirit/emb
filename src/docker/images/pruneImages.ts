import Docker, { PruneImagesInfo } from 'dockerode';

const docker = new Docker();

// For some reason it's not typed in dockerode
export type PruneImagesOptions = {
  dangling?: boolean;
  label?: Array<string>;
};

export const pruneImages = async (
  opts?: PruneImagesOptions,
): Promise<PruneImagesInfo> => {
  const info = await docker.pruneImages({
    ...opts,
  });

  return info;
};
