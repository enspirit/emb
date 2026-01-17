import { Hook, settings } from '@oclif/core';

const hook: Hook.Init = async function (_options) {
  // Disable oclif's auto-transpilation to avoid spurious warnings when npm-linked.
  // We always run from compiled JS in dist/, so auto-transpilation is not needed.
  // This prevents a double tsPath() call that produces "Could not find source" warnings.
  settings.enableAutoTranspile = false;
};

export default hook;
