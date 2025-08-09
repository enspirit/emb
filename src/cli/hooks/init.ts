import { setContext } from '@';
import 'dotenv/config';
import { Hook, Performance } from '@oclif/core';
import Dockerode from 'dockerode';

import { loadConfig } from '@/config';
import { Monorepo } from '@/monorepo';

const withMarker = async <T>(
  owner: string,
  name: string,
  cb: () => Promise<T>,
): Promise<T> => {
  const marker = Performance.mark(owner, name);

  const res = await cb();

  marker?.stop();

  return res;
};

const hook: Hook.Init = async function (options) {
  try {
    const config = await withMarker('emb:config', 'load', () => loadConfig());

    const monorepo = await withMarker('emb:monorepo', 'init', () => {
      return new Monorepo(config).init();
    });

    setContext({
      docker: new Dockerode(),
      monorepo,
    });
  } catch (error) {
    options.context.error(error as Error);
  }
};

export default hook;
