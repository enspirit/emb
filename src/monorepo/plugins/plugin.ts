import { Monorepo, MonorepoConfig } from '@/monorepo';

export abstract class AbstractPlugin<C = unknown> {
  /**
   * The name of the plugin (must be unique)
   */
  static name: string;

  constructor(
    protected config: C,
    protected monorepo: Monorepo,
  ) {}

  /*
   * This is how plugin can dynamically contribute to the configuration
   * By example by auto-discovering components, tasks, etc
   */
  extendConfig?(config: MonorepoConfig): Promise<MonorepoConfig>;

  /**
   * Initialization of a plugin.
   */
  init?(): Promise<void>;
}
