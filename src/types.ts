import type Docker from 'dockerode';

import { Monorepo } from './monorepo/index.js';

export interface EmbContext {
  docker: Docker;
  monorepo: Monorepo;
}
