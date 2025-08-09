import { Monorepo, MonorepoConfig } from '@/monorepo';

export interface IEMBPlugin<C = unknown> {
  /*
   * This is how plugin can dynamically contribute to the configuration
   * By example by auto-discovering components, tasks, etc
   */
  extendConfig?(config: MonorepoConfig): Promise<MonorepoConfig>;

  /**
   * Initialization of a plugin.
   */
  init?(config: C, monorepo: Monorepo): Promise<void>;

  /**
   * The name of the plugin (must be unique)
   */
  name: string;
}
