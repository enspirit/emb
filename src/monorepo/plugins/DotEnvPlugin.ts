import { configDotenv } from 'dotenv';

import { Monorepo } from '@/monorepo';

import { AbstractPlugin } from './plugin.js';

export class DotEnvPlugin extends AbstractPlugin<Array<string>> {
  static name = 'dotenv';

  // Load .env synchronously in the constructor: the Monorepo's env block
  // (e.g. `FOO: ${env:FOO:-default}`) is expanded right after plugins are
  // instantiated and before any plugin's async `init()` runs. Loading dotenv
  // here ensures values from .env are visible during that expansion.
  constructor(config: Array<string>, monorepo: Monorepo) {
    super(config, monorepo);
    configDotenv({
      // dotenv gives priority to the first file that defines a variable, and
      // never overrides what is already in process.env. Reverse the list so
      // that files listed last win over the ones listed before, as with
      // docker-compose's `env_file`, while the shell environment still wins
      // over all of them.
      path: [...this.config].reverse().map((p) => this.monorepo.join(p)),
      quiet: true,
    });
  }
}
