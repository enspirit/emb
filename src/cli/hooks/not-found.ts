import { Hook } from '@oclif/core';

const hook: Hook.CommandNotFound = async function (opts) {
  return opts.config.runCommand('tasks:run', process.argv.splice(2));
};

export default hook;
