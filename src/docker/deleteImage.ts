import Docker from 'dockerode';

const docker = new Docker();

export type ImageRemoveOptions = {
  force?: boolean;
  removeAnonymousVolumes?: boolean;
};

export const deleteImage = async (
  name: string,
  opts?: ImageRemoveOptions,
): Promise<unknown> => {
  const image = await docker.getImage(name);

  return image.remove(opts);
};
