import type Docker from 'dockerode';

import { Monorepo } from '@/monorepo';

export interface EmbContext {
  docker: Docker;
  monorepo: Monorepo;
}
