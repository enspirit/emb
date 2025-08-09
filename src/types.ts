import type Docker from 'dockerode';

import { Monorepo } from '@/monorepo';

/**
 * The context is meant to be what all plugins can decorate
 * to install their own things
 *
 * Similar to Request in Expressjs projects, feel free to extend the type
 * and install here things that to be accessible by operations during a CLI run
 */
export interface EmbContext {
  docker: Docker;
  monorepo: Monorepo;
}
