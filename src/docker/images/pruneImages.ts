import { PruneImagesInfo } from 'dockerode';

import { getContext } from '../../cli/context.js';

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
