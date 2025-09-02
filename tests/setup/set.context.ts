import { DockerComposeClient, setContext } from '@';
import Dockerode from 'dockerode';
import { CompleteExample } from 'tests/fixtures/complete-example.js';
import { beforeEach, vi } from 'vitest';

import { createKubernetesClient } from '@/kubernetes/client.js';
import { Monorepo, MonorepoConfig } from '@/monorepo';

// eslint-disable-next-line mocha/no-top-level-hooks
beforeEach(async () => {
  const config = new MonorepoConfig(CompleteExample);
  const monorepo = new Monorepo(config, '/tmp/monorepo');
  const compose = new DockerComposeClient(monorepo);

  setContext({
    docker: vi.mockObject(new Dockerode()),
    kubernetes: vi.mockObject(createKubernetesClient()),
    monorepo,
    compose,
  });
});
