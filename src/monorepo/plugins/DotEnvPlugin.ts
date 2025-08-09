import { configDotenv } from 'dotenv';

import { AbstractPlugin } from './plugin.js';

export class DotEnvPlugin extends AbstractPlugin<Array<string>> {
  static name = 'dotenv';

  async init() {
    configDotenv({
      path: this.config.map((p) => this.monorepo.join(p)),
      quiet: true,
    });
  }
}
