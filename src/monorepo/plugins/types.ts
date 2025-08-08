import { Monorepo, MonorepoConfig } from '@/monorepo';

export interface IEMBPlugin {
  run(config: Monorepo): Promise<MonorepoConfig>;
}
