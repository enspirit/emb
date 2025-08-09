import { getContext } from '@';
import { Container } from 'dockerode';

export const getContainer = async (id: string): Promise<Container> => {
  const { docker } = getContext();
  return docker.getContainer(id);
};
