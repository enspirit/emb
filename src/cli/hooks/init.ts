import { Hook } from '@oclif/core';

import { loadConfig } from '../../config/index.js';

const hook: Hook.Init = async function (options) {
  try {
    const config = await loadConfig();
    console.log('->', config);
  } catch (error) {
    options.context.error(error as Error);
  }
};

export default hook;
