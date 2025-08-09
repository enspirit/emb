import { setContext } from '@';
import 'dotenv/config';
import { Hook } from '@oclif/core';
import Dockerode from 'dockerode';

import { loadConfig } from '@/config';
import { Monorepo } from '@/monorepo';

const hook: Hook.Init = async function (options) {
  try {
    const config = await loadConfig();
    const monorepo = new Monorepo(config);

    await monorepo.init();

    setContext({
      docker: new Dockerode(),
      monorepo,
    });
  } catch (error) {
    options.context.error(error as Error);
  }
};

export default hook;
