import { AbstractSecretProvider, SecretReference } from './SecretProvider.js';

/**
 * Type for async source functions compatible with TemplateExpander.
 */
export type AsyncSecretSource = (key: string) => Promise<unknown>;

/**
 * Manages secret providers and creates template sources for them.
 */
export class SecretManager {
  private providers = new Map<string, AbstractSecretProvider>();

  /**
   * Register a secret provider.
   * @param name Provider name (e.g., 'vault', 'op')
   * @param provider The provider instance
   */
  register(name: string, provider: AbstractSecretProvider): void {
    if (this.providers.has(name)) {
      throw new Error(`Secret provider '${name}' is already registered`);
    }

    this.providers.set(name, provider);
  }

  /**
   * Get a registered provider by name.
   * @param name Provider name
   * @returns The provider instance or undefined if not found
   */
  get(name: string): AbstractSecretProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Check if a provider is registered.
   * @param name Provider name
   */
  has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get all registered provider names.
   */
  getProviderNames(): string[] {
    return [...this.providers.keys()];
  }

  /**
   * Connect all registered providers.
   */
  async connectAll(): Promise<void> {
    await Promise.all([...this.providers.values()].map((p) => p.connect()));
  }

  /**
   * Disconnect all registered providers.
   */
  async disconnectAll(): Promise<void> {
    await Promise.all([...this.providers.values()].map((p) => p.disconnect()));
  }

  /**
   * Parse a secret reference string into a SecretReference object.
   * Format: "path/to/secret#key" or "path/to/secret"
   * @param refString The reference string to parse
   */
  parseReference(refString: string): SecretReference {
    const [path, key] = refString.split('#');
    return { path, key };
  }

  /**
   * Create an async source function for use with TemplateExpander.
   * @param providerName The name of the provider to use
   * @returns An async function that resolves secrets
   */
  createSource(providerName: string): AsyncSecretSource {
    return async (key: string): Promise<unknown> => {
      const provider = this.get(providerName);

      if (!provider) {
        throw new Error(
          `Secret provider '${providerName}' not found. ` +
            `Available providers: ${this.getProviderNames().join(', ') || 'none'}`,
        );
      }

      const ref = this.parseReference(key);
      return provider.get(ref);
    };
  }
}
