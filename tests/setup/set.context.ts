import { setContext } from '@';
import Dockerode from 'dockerode';
import { CompleteExample } from 'tests/fixtures/complete-example.js';
import { beforeEach, vi } from 'vitest';

import { Monorepo, MonorepoConfig } from '@/monorepo';

// eslint-disable-next-line mocha/no-top-level-hooks
beforeEach(async () => {
  const config = new MonorepoConfig(CompleteExample);

  setContext({
    docker: vi.mockObject(new Dockerode()),
    monorepo: new Monorepo(config, '/tmp/monorepo'),
  });
});
