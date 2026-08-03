import type { KubernetesClient } from '@/types.js';

import { getContext } from '@/context.js';

/**
 * Builds a fresh Kubernetes client.
 *
 * The import is dynamic on purpose: @kubernetes/client-node is ~14.5MB of ESM,
 * which is two thirds of everything a command like `emb ps` would otherwise
 * have to parse. Keeping it out of the static import graph means only commands
 * that actually talk to Kubernetes pay for it.
 */
export const createKubernetesClient = async (): Promise<KubernetesClient> => {
  const { AppsV1Api, CoreV1Api, KubeConfig } =
    await import('@kubernetes/client-node');

  const kc = new KubeConfig();
  kc.loadFromDefault();

  return {
    apps: kc.makeApiClient(AppsV1Api),
    config: kc,
    core: kc.makeApiClient(CoreV1Api),
  };
};

/**
 * Returns the run's Kubernetes client, creating it on first use.
 *
 * Cached on the context, so a client injected by tests (or by a plugin) is
 * returned as-is rather than being replaced by a real one.
 */
export const getKubernetesClient = async (): Promise<KubernetesClient> => {
  const context = getContext();

  if (context?.kubernetes) {
    return context.kubernetes;
  }

  const client = await createKubernetesClient();

  if (context) {
    context.kubernetes = client;
  }

  return client;
};
