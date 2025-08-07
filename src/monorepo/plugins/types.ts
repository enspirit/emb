import { MonorepoConfig } from '../config.js';
import { Monorepo } from '../index.js';

export interface IEMBPlugin {
  run(config: Monorepo): Promise<MonorepoConfig>;
}
