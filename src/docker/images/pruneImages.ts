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

  // The Docker Engine API POST /images/prune only recognises a single
  // `filters` query param (a JSON-encoded map of string arrays). Passing
  // dangling/label as top-level options makes the daemon silently ignore them
  // and prune every dangling image on the host, not just this project's.
  const filters: Record<string, Array<string>> = {};
  if (opts?.dangling !== undefined) {
    filters.dangling = [String(opts.dangling)];
  }

  if (opts?.label?.length) {
    filters.label = opts.label;
  }

  const info = await docker.pruneImages({
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  });

  return info;
};
