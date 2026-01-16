/* eslint-disable n/no-unsupported-features/node-builtins -- fetch is stable in Node 20+ */
import { AbstractSecretProvider, SecretReference } from '../SecretProvider.js';
import {
  cacheToken,
  clearCachedToken,
  getCachedToken,
} from './VaultTokenCache.js';

/**
 * Authentication configuration for HashiCorp Vault.
 */
export type VaultAuthConfig =
  | { method: 'approle'; roleId: string; secretId: string }
  | { method: 'jwt'; role: string; jwt: string }
  | { method: 'kubernetes'; role: string }
  | { method: 'oidc'; role?: string; port?: number }
  | { method: 'token'; token: string };

/**
 * Configuration for the Vault provider.
 */
export interface VaultProviderConfig {
  /** Vault server address (defaults to VAULT_ADDR env var) */
  address: string;
  /** Authentication configuration */
  auth: VaultAuthConfig;
  /** Vault namespace (optional, defaults to VAULT_NAMESPACE env var) */
  namespace?: string;
}

/**
 * Error class for Vault-specific errors.
 */
export class VaultError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'VaultError';
  }
}

/**
 * Result of an authentication operation.
 */
interface AuthResult {
  token: string;
  /** Token TTL in seconds */
  ttlSeconds: number;
}

/**
 * HashiCorp Vault secret provider.
 * Supports KV v2 secrets engine.
 */
export class VaultProvider extends AbstractSecretProvider<VaultProviderConfig> {
  private token: null | string = null;

  async connect(): Promise<void> {
    const { auth, address, namespace } = this.config;

    // Try to use cached token first (for methods that benefit from caching)
    if (auth.method === 'oidc') {
      const cached = await getCachedToken(address, namespace);
      if (cached) {
        this.token = cached.token;
        try {
          await this.verifyToken();
          // Cached token is still valid
          return;
        } catch {
          // Cached token is invalid, clear it and proceed with fresh auth
          await clearCachedToken(address, namespace);
          this.token = null;
        }
      }
    }

    let authResult: AuthResult;

    switch (auth.method) {
      case 'approle': {
        authResult = await this.loginAppRole(auth.roleId, auth.secretId);
        break;
      }

      case 'jwt': {
        authResult = await this.loginJwt(auth.role, auth.jwt);
        break;
      }

      case 'kubernetes': {
        authResult = await this.loginKubernetes(auth.role);
        break;
      }

      case 'oidc': {
        authResult = await this.loginOidc(auth.role, auth.port);
        break;
      }

      case 'token': {
        // For explicit tokens, we don't know the TTL - use a default
        authResult = { token: auth.token, ttlSeconds: 3600 };
        break;
      }

      default: {
        throw new VaultError(
          `Unsupported auth method: ${(auth as { method: string }).method}`,
          'VAULT_AUTH_ERROR',
        );
      }
    }

    this.token = authResult.token;

    // Verify the token works by looking it up
    await this.verifyToken();

    // Cache the token for methods that benefit from caching
    if (auth.method === 'oidc' && authResult.ttlSeconds > 0) {
      await cacheToken(address, authResult.token, authResult.ttlSeconds, namespace);
    }
  }

  async disconnect(): Promise<void> {
    this.token = null;
    this.clearCache();
  }

  async fetchSecret(ref: SecretReference): Promise<Record<string, unknown>> {
    if (!this.token) {
      throw new VaultError('Not connected to Vault', 'VAULT_NOT_CONNECTED');
    }

    // For KV v2, the path needs 'data' inserted after the mount point
    // e.g., "secret/myapp" becomes "secret/data/myapp"
    const path = this.normalizeKvPath(ref.path);
    const url = new URL(`/v1/${path}`, this.config.address);

    if (ref.version) {
      url.searchParams.set('version', ref.version);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      const error = await this.parseErrorResponse(response);
      const namespace = this.config.namespace
        ? ` (namespace: ${this.config.namespace})`
        : '';
      throw new VaultError(
        `Failed to read secret at '${ref.path}'${namespace}: ${error.message}`,
        'VAULT_READ_ERROR',
        response.status,
      );
    }

    const data = await response.json();

    // KV v2 wraps the data in a 'data' field
    return (
      (data as { data?: { data?: Record<string, unknown> } }).data?.data ||
      (data as { data?: Record<string, unknown> }).data ||
      {}
    );
  }

  /**
   * Normalize a path for the appropriate secrets engine.
   * - KV v2: Insert '/data/' after the mount point
   * - 1Password Connect: Use path as-is (contains /vaults/ and /items/)
   * - Other engines: Use path as-is
   */
  private normalizeKvPath(path: string): string {
    // If path already contains '/data/', assume it's correctly formatted for KV v2
    if (path.includes('/data/')) {
      return path;
    }

    // 1Password Connect paths contain /vaults/ and /items/ - don't modify
    if (path.includes('/vaults/') || path.includes('/items/')) {
      return path;
    }

    // For KV v2, insert /data/ after the mount point
    // Split by first '/' to get mount and rest of path
    const firstSlash = path.indexOf('/');
    if (firstSlash === -1) {
      // Just a mount, no sub-path
      return `${path}/data`;
    }

    const mount = path.slice(0, Math.max(0, firstSlash));
    const subPath = path.slice(Math.max(0, firstSlash + 1));
    return `${mount}/data/${subPath}`;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Vault-Token': this.token!,
      'Content-Type': 'application/json',
    };

    if (this.config.namespace) {
      headers['X-Vault-Namespace'] = this.config.namespace;
    }

    return headers;
  }

  private async loginAppRole(
    roleId: string,
    secretId: string,
  ): Promise<AuthResult> {
    const url = new URL('/v1/auth/approle/login', this.config.address);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.namespace && {
          'X-Vault-Namespace': this.config.namespace,
        }),
      },
      // Vault API uses snake_case for these properties
      // eslint-disable-next-line camelcase
      body: JSON.stringify({ role_id: roleId, secret_id: secretId }),
    });

    if (!response.ok) {
      const error = await this.parseErrorResponse(response);
      throw new VaultError(
        `AppRole login failed: ${error.message}`,
        'VAULT_AUTH_ERROR',
        response.status,
      );
    }

    const data = (await response.json()) as {
      auth?: { client_token?: string; lease_duration?: number };
    };
    return {
      token: data.auth?.client_token || '',
      ttlSeconds: data.auth?.lease_duration || 3600,
    };
  }

  private async loginKubernetes(role: string): Promise<AuthResult> {
    // Read the service account token from the mounted file
    const fs = await import('node:fs/promises');
    const tokenPath = '/var/run/secrets/kubernetes.io/serviceaccount/token';

    let jwt: string;
    try {
      jwt = await fs.readFile(tokenPath, 'utf8');
    } catch {
      throw new VaultError(
        `Could not read Kubernetes service account token from ${tokenPath}`,
        'VAULT_AUTH_ERROR',
      );
    }

    const url = new URL('/v1/auth/kubernetes/login', this.config.address);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.namespace && {
          'X-Vault-Namespace': this.config.namespace,
        }),
      },
      body: JSON.stringify({ role, jwt }),
    });

    if (!response.ok) {
      const error = await this.parseErrorResponse(response);
      throw new VaultError(
        `Kubernetes login failed: ${error.message}`,
        'VAULT_AUTH_ERROR',
        response.status,
      );
    }

    const data = (await response.json()) as {
      auth?: { client_token?: string; lease_duration?: number };
    };
    return {
      token: data.auth?.client_token || '',
      ttlSeconds: data.auth?.lease_duration || 3600,
    };
  }

  /**
   * Authenticate using JWT (non-interactive).
   * Suitable for CI/CD pipelines where a JWT is provided externally.
   */
  private async loginJwt(role: string, jwt: string): Promise<AuthResult> {
    const url = new URL('/v1/auth/jwt/login', this.config.address);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.namespace && {
          'X-Vault-Namespace': this.config.namespace,
        }),
      },
      body: JSON.stringify({ role, jwt }),
    });

    if (!response.ok) {
      const error = await this.parseErrorResponse(response);
      throw new VaultError(
        `JWT login failed: ${error.message}`,
        'VAULT_AUTH_ERROR',
        response.status,
      );
    }

    const data = (await response.json()) as {
      auth?: { client_token?: string; lease_duration?: number };
    };
    return {
      token: data.auth?.client_token || '',
      ttlSeconds: data.auth?.lease_duration || 3600,
    };
  }

  /**
   * Authenticate using OIDC (interactive browser flow).
   * Opens a browser for the user to authenticate with Keycloak/OIDC provider.
   */
  private async loginOidc(role?: string, port?: number): Promise<AuthResult> {
    const { performOidcLogin } = await import('./VaultOidcHelper.js');
    const result = await performOidcLogin({
      vaultAddress: this.config.address,
      role,
      port: port ?? 8250,
      namespace: this.config.namespace,
    });
    return {
      token: result.token,
      ttlSeconds: result.ttlSeconds,
    };
  }

  private async verifyToken(): Promise<void> {
    const url = new URL('/v1/auth/token/lookup-self', this.config.address);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      const error = await this.parseErrorResponse(response);
      throw new VaultError(
        `Token verification failed: ${error.message}`,
        'VAULT_AUTH_ERROR',
        response.status,
      );
    }
  }

  private async parseErrorResponse(
    response: Response,
  ): Promise<{ message: string }> {
    try {
      const data = (await response.json()) as { errors?: string[] };
      return {
        message: data.errors?.join(', ') || `HTTP ${response.status}`,
      };
    } catch {
      return { message: `HTTP ${response.status}: ${response.statusText}` };
    }
  }
}
