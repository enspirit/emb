import { Hook } from '@oclif/core';
import 'dotenv/config';
import Dockerode from 'dockerode';

import { setContext } from '@/cli';
import { loadConfig } from '@/config';
import { Monorepo } from '@/monorepo';

const hook: Hook.Init = async function (options) {
  try {
    const config = await loadConfig();
    const monorepo = new Monorepo(config);

    await monorepo.init();

    const envVars = await monorepo.getEnvVars();
    Object.assign(process.env, envVars);

    setContext({
      docker: new Dockerode(),
      monorepo,
    });
  } catch (error) {
    options.context.error(error as Error);
  }
};

export default hook;
