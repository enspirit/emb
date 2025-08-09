#!/usr/bin/env node

import { execute, Performance, settings } from '@oclif/core';

settings.performanceEnabled = Boolean(process.env.EMB_DEBUG_PERFS);

await execute({ dir: import.meta.url }).finally(() => {
  if (settings.performanceEnabled) {
    console.log(Performance.results);
  }
});
