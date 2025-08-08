import { getContext } from '../../cli/context.js';

export type ImageRemoveOptions = {
  force?: boolean;
  removeAnonymousVolumes?: boolean;
};

export const deleteImage = async (
  name: string,
  opts?: ImageRemoveOptions,
): Promise<unknown> => {
  const { docker } = getContext();
  const image = await docker.getImage(name);

  return image.remove(opts);
};
