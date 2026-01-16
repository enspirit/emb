import { getContext } from '@/context.js';
import {
  VaultAuthConfig,
  VaultProvider,
  VaultProviderConfig,
} from '@/secrets/providers/VaultProvider.js';

import { AbstractPlugin } from './plugin.js';

/**
 * Configuration for the Vault plugin in .emb.yml
 */
export interface VaultPluginConfig {
  /** Vault server address. Defaults to VAULT_ADDR env var. */
  address?: string;
  /** Authentication configuration */
  auth?: VaultAuthConfig;
  /** Vault namespace. Defaults to VAULT_NAMESPACE env var. */
  namespace?: string;
}

/**
 * Plugin that integrates HashiCorp Vault with EMB.
 *
 * Usage in .emb.yml:
 * ```yaml
 * plugins:
 *   - name: vault
 *     config:
 *       address: ${env:VAULT_ADDR:-http://localhost:8200}
 *       auth:
 *         method: token
 *         token: ${env:VAULT_TOKEN}
 * ```
 *
 * Then use secrets in templates:
 * ```yaml
 * env:
 *   DB_PASSWORD: ${vault:secret/myapp/db#password}
 * ```
 */
export class VaultPlugin extends AbstractPlugin<VaultPluginConfig> {
  static name = 'vault';
  private provider: null | VaultProvider = null;

  async init(): Promise<void> {
    const resolvedConfig = this.resolveConfig();
    this.provider = new VaultProvider(resolvedConfig);

    await this.provider.connect();

    // Register the provider with the global SecretManager
    const context = getContext();
    if (context?.secrets) {
      context.secrets.register('vault', this.provider);
    }
  }

  /**
   * Resolve the plugin configuration, filling in defaults from env vars.
   */
  private resolveConfig(): VaultProviderConfig {
    const address = this.config.address || process.env.VAULT_ADDR;
    if (!address) {
      throw new Error(
        'Vault address not configured. Set VAULT_ADDR environment variable or configure address in plugin config.',
      );
    }

    const auth = this.resolveAuth();

    return {
      address,
      namespace: this.config.namespace || process.env.VAULT_NAMESPACE,
      auth,
    };
  }

  /**
   * Resolve authentication configuration.
   */
  private resolveAuth(): VaultAuthConfig {
    // If explicit auth config is provided, use it
    if (this.config.auth) {
      return this.config.auth;
    }

    // Try to infer from environment
    const token = process.env.VAULT_TOKEN;
    if (token) {
      return { method: 'token', token };
    }

    const roleId = process.env.VAULT_ROLE_ID;
    const secretId = process.env.VAULT_SECRET_ID;
    if (roleId && secretId) {
      return { method: 'approle', roleId, secretId };
    }

    const k8sRole = process.env.VAULT_K8S_ROLE;
    if (k8sRole) {
      return { method: 'kubernetes', role: k8sRole };
    }

    // JWT auth (non-interactive, for CI/CD)
    const jwt = process.env.VAULT_JWT;
    const jwtRole = process.env.VAULT_JWT_ROLE;
    if (jwt && jwtRole) {
      return { method: 'jwt', role: jwtRole, jwt };
    }

    // OIDC auth (interactive browser flow)
    const oidcRole = process.env.VAULT_OIDC_ROLE;
    if (oidcRole !== undefined) {
      return { method: 'oidc', role: oidcRole || undefined };
    }

    throw new Error(
      'Vault authentication not configured. ' +
        'Set VAULT_TOKEN, or VAULT_ROLE_ID + VAULT_SECRET_ID, ' +
        'or VAULT_K8S_ROLE, or VAULT_JWT + VAULT_JWT_ROLE, ' +
        'or VAULT_OIDC_ROLE environment variable, ' +
        'or configure auth in plugin config.',
    );
  }
}
