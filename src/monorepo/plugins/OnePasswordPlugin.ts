import { getContext } from '@/context.js';
import {
  OnePasswordProvider,
  OnePasswordProviderConfig,
} from '@/secrets/providers/OnePasswordProvider.js';

import { AbstractPlugin } from './plugin.js';

/**
 * Configuration for the 1Password plugin in .emb.yml
 */
export interface OnePasswordPluginConfig {
  /** Account shorthand or UUID (optional). Defaults to OP_ACCOUNT env var. */
  account?: string;
}

/**
 * Plugin that integrates 1Password CLI with EMB.
 *
 * Usage in .emb.yml:
 * ```yaml
 * plugins:
 *   - name: op
 *     config:
 *       account: my-team  # Optional: specific 1Password account
 * ```
 *
 * Then use secrets in templates:
 * ```yaml
 * env:
 *   DB_PASSWORD: ${op:Production/database-credentials#password}
 *   API_KEY: ${op:Development/api-keys#secret-key}
 * ```
 *
 * Authentication methods:
 * 1. Pre-authenticated session (interactive) - User runs `op signin` before using EMB
 * 2. Service account token (CI/CD) - Via `OP_SERVICE_ACCOUNT_TOKEN` env var
 */
export class OnePasswordPlugin extends AbstractPlugin<OnePasswordPluginConfig> {
  static name = 'op';
  private provider: null | OnePasswordProvider = null;

  async init(): Promise<void> {
    const resolvedConfig = this.resolveConfig();
    this.provider = new OnePasswordProvider(resolvedConfig);

    // Register the provider with the global SecretManager
    // Connection is lazy - op CLI is only checked when secrets are actually fetched
    const context = getContext();
    if (context?.secrets) {
      context.secrets.register('op', this.provider);
    }
  }

  /**
   * Resolve the plugin configuration, filling in defaults from env vars.
   */
  private resolveConfig(): OnePasswordProviderConfig {
    return {
      account: this.config?.account || process.env.OP_ACCOUNT,
    };
  }
}
