import { Container } from 'dockerode';

import { getContext } from '@/cli';

export const getContainer = async (id: string): Promise<Container> => {
  const { docker } = getContext();
  return docker.getContainer(id);
};
