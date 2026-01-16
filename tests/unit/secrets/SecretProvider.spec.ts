import { beforeEach, describe, expect, test } from 'vitest';

import {
  AbstractSecretProvider,
  SecretReference,
} from '@/secrets/SecretProvider.js';

// Create a concrete implementation for testing
class TestSecretProvider extends AbstractSecretProvider<{
  testOption: string;
}> {
  public connectCalled = false;
  public disconnectCalled = false;
  public fetchSecretCalls: SecretReference[] = [];

  // Expose protected config for testing
  get testConfig() {
    return this.config;
  }

  async connect(): Promise<void> {
    this.connectCalled = true;
  }

  async disconnect(): Promise<void> {
    this.disconnectCalled = true;
  }

  async fetchSecret(ref: SecretReference): Promise<Record<string, unknown>> {
    this.fetchSecretCalls.push(ref);
    return {
      password: 'secret123',
      username: 'testuser',
    };
  }
}

describe('Secrets / SecretProvider', () => {
  let provider: TestSecretProvider;

  beforeEach(() => {
    provider = new TestSecretProvider({ testOption: 'value' });
  });

  describe('config', () => {
    test('stores configuration passed to constructor', () => {
      expect(provider.testConfig).to.deep.equal({ testOption: 'value' });
    });
  });

  describe('#connect()', () => {
    test('calls the connect method', async () => {
      await provider.connect();
      expect(provider.connectCalled).to.equal(true);
    });
  });

  describe('#disconnect()', () => {
    test('calls the disconnect method', async () => {
      await provider.disconnect();
      expect(provider.disconnectCalled).to.equal(true);
    });
  });

  describe('#get()', () => {
    test('fetches secret and returns entire record when no key specified', async () => {
      const result = await provider.get({ path: 'secret/test' });
      expect(result).to.deep.equal({
        password: 'secret123',
        username: 'testuser',
      });
    });

    test('fetches secret and returns specific key when key specified', async () => {
      const result = await provider.get({
        path: 'secret/test',
        key: 'password',
      });
      expect(result).to.equal('secret123');
    });

    test('caches secrets by path and version', async () => {
      await provider.get({ path: 'secret/test' });
      await provider.get({ path: 'secret/test' });
      await provider.get({ path: 'secret/test', key: 'username' });

      // Should only have called fetchSecret once (cached)
      expect(provider.fetchSecretCalls.length).to.equal(1);
    });

    test('fetches different versions separately', async () => {
      await provider.get({ path: 'secret/test', version: '1' });
      await provider.get({ path: 'secret/test', version: '2' });
      await provider.get({ path: 'secret/test' }); // defaults to 'latest'

      // Should have called fetchSecret three times (different versions)
      expect(provider.fetchSecretCalls.length).to.equal(3);
    });
  });

  describe('#clearCache()', () => {
    test('clears the cache', async () => {
      await provider.get({ path: 'secret/test' });
      provider.clearCache();
      await provider.get({ path: 'secret/test' });

      // Should have called fetchSecret twice (cache was cleared)
      expect(provider.fetchSecretCalls.length).to.equal(2);
    });
  });
});
