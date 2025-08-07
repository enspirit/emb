import { Hook } from '@oclif/core';
import 'dotenv/config';

import { loadConfig } from '../../config/index.js';
import { Monorepo } from '../../monorepo/index.js';
import { setContext } from '../context.js';

const hook: Hook.Init = async function (options) {
  try {
    const config = await loadConfig();
    const monorepo = new Monorepo(config);

    await monorepo.init();

    setContext({
      monorepo,
    });
  } catch (error) {
    options.context.error(error as Error);
  }
};

export default hook;
