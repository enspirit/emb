import { AppsV1Api, CoreV1Api, KubeConfig } from '@kubernetes/client-node';

export const createKubernetesClient = () => {
  const kc = new KubeConfig();
  kc.loadFromDefault();

  return {
    config: kc,
    core: kc.makeApiClient(CoreV1Api),
    apps: kc.makeApiClient(AppsV1Api),
  };
};
