import { Hook } from '@oclif/core';

import { loadConfig } from '../../config/index.js';

const hook: Hook.Init = async function (options) {
  console.log('BORDEL');
  process.exit(-1);
  try {
    const config = await loadConfig();
    console.log('CONFIG', config);
  } catch (error) {
    console.log('ERROR', error);
    options.context.error(error as Error);
  }
};

export default hook;
