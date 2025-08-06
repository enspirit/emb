import { Hook } from '@oclif/core';

import { loadConfig } from '../../config/index.js';

const hook: Hook.Init = async function (options) {
  try {
    const _config = await loadConfig();
  } catch (error) {
    options.context.error(error as Error);
  }
};

export default hook;
