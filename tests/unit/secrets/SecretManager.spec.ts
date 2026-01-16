import { beforeEach, describe, expect, test } from 'vitest';

import { SecretManager } from '@/secrets/SecretManager.js';
import {
  AbstractSecretProvider,
  SecretReference,
} from '@/secrets/SecretProvider.js';

// Create a mock provider for testing
class MockProvider extends AbstractSecretProvider<void> {
  public connected = false;
  public disconnected = false;
  public secrets: Record<string, Record<string, unknown>> = {};

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.disconnected = true;
  }

  async fetchSecret(ref: SecretReference): Promise<Record<string, unknown>> {
    return this.secrets[ref.path] || {};
  }
}

describe('Secrets / SecretManager', () => {
  let manager: SecretManager;
  let mockProvider: MockProvider;

  beforeEach(() => {
    manager = new SecretManager();
    mockProvider = new MockProvider();
    mockProvider.secrets = {
      'secret/test': { password: 'secret123', username: 'testuser' },
    };
  });

  describe('#register()', () => {
    test('registers a provider by name', () => {
      manager.register('vault', mockProvider);
      expect(manager.has('vault')).to.equal(true);
    });

    test('throws error if provider name already registered', () => {
      manager.register('vault', mockProvider);
      expect(() => manager.register('vault', new MockProvider())).to.throw(
        "Secret provider 'vault' is already registered",
      );
    });
  });

  describe('#get()', () => {
    test('returns registered provider', () => {
      manager.register('vault', mockProvider);
      expect(manager.get('vault')).to.equal(mockProvider);
    });

    test('returns undefined for unregistered provider', () => {
      expect(manager.get('nonexistent')).to.equal(undefined);
    });
  });

  describe('#has()', () => {
    test('returns true for registered provider', () => {
      manager.register('vault', mockProvider);
      expect(manager.has('vault')).to.equal(true);
    });

    test('returns false for unregistered provider', () => {
      expect(manager.has('vault')).to.equal(false);
    });
  });

  describe('#getProviderNames()', () => {
    test('returns empty array when no providers registered', () => {
      expect(manager.getProviderNames()).to.deep.equal([]);
    });

    test('returns all registered provider names', () => {
      manager.register('vault', mockProvider);
      manager.register('op', new MockProvider());
      expect(manager.getProviderNames()).to.deep.equal(['vault', 'op']);
    });
  });

  describe('#connectAll()', () => {
    test('connects all registered providers', async () => {
      const provider1 = new MockProvider();
      const provider2 = new MockProvider();
      manager.register('vault', provider1);
      manager.register('op', provider2);

      await manager.connectAll();

      expect(provider1.connected).to.equal(true);
      expect(provider2.connected).to.equal(true);
    });
  });

  describe('#disconnectAll()', () => {
    test('disconnects all registered providers', async () => {
      const provider1 = new MockProvider();
      const provider2 = new MockProvider();
      manager.register('vault', provider1);
      manager.register('op', provider2);

      await manager.disconnectAll();

      expect(provider1.disconnected).to.equal(true);
      expect(provider2.disconnected).to.equal(true);
    });
  });

  describe('#parseReference()', () => {
    test('parses path without key', () => {
      const ref = manager.parseReference('secret/data/myapp');
      expect(ref).to.deep.equal({
        path: 'secret/data/myapp',
        key: undefined,
      });
    });

    test('parses path with key', () => {
      const ref = manager.parseReference('secret/data/myapp#password');
      expect(ref).to.deep.equal({
        path: 'secret/data/myapp',
        key: 'password',
      });
    });
  });

  describe('#createSource()', () => {
    test('creates an async source function', async () => {
      manager.register('vault', mockProvider);
      const source = manager.createSource('vault');

      const result = await source('secret/test#password');
      expect(result).to.equal('secret123');
    });

    test('throws error if provider not found', async () => {
      const source = manager.createSource('nonexistent');

      await expect(source('secret/test#password')).rejects.toThrow(
        "Secret provider 'nonexistent' not found",
      );
    });
  });
});
