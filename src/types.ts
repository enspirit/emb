import type { AppsV1Api, CoreV1Api, KubeConfig } from '@kubernetes/client-node';
import type Docker from 'dockerode';

import { Monorepo } from '@/monorepo';
import { SecretManager } from '@/secrets';

import { DockerComposeClient } from './docker/index.js';

export interface KubernetesClient {
  apps: AppsV1Api;
  config: KubeConfig;
  core: CoreV1Api;
}

/**
 * The context is meant to be what all plugins can decorate
 * to install their own things
 *
 * Similar to Request in Expressjs projects, feel free to extend the type
 * and install here things that to be accessible by operations during a CLI run
 */
export interface EmbContext {
  compose: DockerComposeClient;
  docker: Docker;
  /**
   * Absent until something asks for it. Reach it via getKubernetesClient(),
   * which populates it on first use — @kubernetes/client-node is 14.5MB of
   * ESM and most commands never touch Kubernetes.
   */
  kubernetes?: KubernetesClient;
  monorepo: Monorepo;
  secrets: SecretManager;
}
