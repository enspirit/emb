import Docker, { Container } from 'dockerode';

const docker = new Docker();

export const getContainer = async (id: string): Promise<Container> => {
  return docker.getContainer(id);
};
