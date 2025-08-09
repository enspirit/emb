import { configDotenv } from 'dotenv';

import { Monorepo } from '../monorepo.js';
import { IEMBPlugin } from './types.js';

export class DotEnvPluging implements IEMBPlugin<Array<string>> {
  name = 'dotenv';

  async init(paths: Array<string>, monorepo: Monorepo) {
    configDotenv({
      path: paths.map((p) => monorepo.join(p)),
      quiet: true,
    });
  }
}
