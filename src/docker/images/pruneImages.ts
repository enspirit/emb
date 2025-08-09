import { getContext } from '@';
import { PruneImagesInfo } from 'dockerode';

// For some reason it's not typed in dockerode
export type PruneImagesOptions = {
  dangling?: boolean;
  label?: Array<string>;
};

export const pruneImages = async (
  opts?: PruneImagesOptions,
): Promise<PruneImagesInfo> => {
  const { docker } = getContext();
  const info = await docker.pruneImages({
    ...opts,
  });

  return info;
};
