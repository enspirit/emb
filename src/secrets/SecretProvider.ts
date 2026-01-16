/**
 * Reference to a secret in a provider.
 */
export interface SecretReference {
  /** Optional field within the secret */
  key?: string;
  /** Path to the secret, e.g., "secret/data/myapp/db" */
  path: string;
  /** Optional version of the secret */
  version?: string;
}

/**
 * Abstract base class for secret providers.
 * Implementations should handle specific secret management systems
 * (e.g., HashiCorp Vault, 1Password).
 */
export abstract class AbstractSecretProvider<C = unknown> {
  protected cache = new Map<string, Record<string, unknown>>();

  constructor(protected config: C) {}

  /**
   * Connect to the secret provider and authenticate.
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the secret provider and clean up resources.
   */
  abstract disconnect(): Promise<void>;

  /**
   * Fetch a secret from the provider.
   * @param ref Reference to the secret
   * @returns The secret data as a key-value record
   */
  abstract fetchSecret(ref: SecretReference): Promise<Record<string, unknown>>;

  /**
   * Get a secret value, using cache if available.
   * @param ref Reference to the secret
   * @returns The secret value (entire record if no key specified, or specific field value)
   */
  async get(ref: SecretReference): Promise<unknown> {
    const cacheKey = `${ref.path}:${ref.version || 'latest'}`;

    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, await this.fetchSecret(ref));
    }

    const cached = this.cache.get(cacheKey)!;

    if (ref.key) {
      if (!(ref.key in cached)) {
        const availableKeys = Object.keys(cached).join(', ') || 'none';
        throw new Error(
          `Key '${ref.key}' not found in secret '${ref.path}'. Available keys: ${availableKeys}`,
        );
      }

      return cached[ref.key];
    }

    return cached;
  }

  /**
   * Clear the cache.
   */
  clearCache(): void {
    this.cache.clear();
  }
}
