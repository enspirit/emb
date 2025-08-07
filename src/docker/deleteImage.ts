import Docker from 'dockerode';

const docker = new Docker();

export const deleteImage = async (name: string): Promise<unknown> => {
  const image = await docker.getImage(name);

  return image.remove();
};
