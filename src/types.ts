import type Docker from 'dockerode';

import { AppsV1Api, CoreV1Api, KubeConfig } from '@kubernetes/client-node';

import { Monorepo } from '@/monorepo';
import { SecretManager } from '@/secrets';

import { DockerComposeClient } from './docker/index.js';

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
  kubernetes: {
    config: KubeConfig;
    apps: AppsV1Api;
    core: CoreV1Api;
  };
  monorepo: Monorepo;
  secrets: SecretManager;
}
