/* eslint-disable n/no-unsupported-features/node-builtins -- fetch is stable in Node 20+ */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  VaultError,
  VaultProvider,
  VaultProviderConfig,
} from '@/secrets/providers/VaultProvider.js';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('Secrets / Providers / VaultProvider', () => {
  let config: VaultProviderConfig;
  let provider: VaultProvider;

  beforeEach(() => {
    mockFetch.mockReset();
    config = {
      address: 'http://localhost:8200',
      auth: { method: 'token', token: 'test-token' },
    };
    provider = new VaultProvider(config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('#connect()', () => {
    test('authenticates with token method', async () => {
      // Mock token verification
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'test-token' } }),
      });

      await provider.connect();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8200/v1/auth/token/lookup-self',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Vault-Token': 'test-token',
          }),
        }),
      );
    });

    test('authenticates with approle method', async () => {
      const approleConfig: VaultProviderConfig = {
        address: 'http://localhost:8200',
        auth: { method: 'approle', roleId: 'role-id', secretId: 'secret-id' },
      };
      provider = new VaultProvider(approleConfig);

      // Mock approle login - Vault API uses client_token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          // eslint-disable-next-line camelcase -- Vault API uses snake_case
          Promise.resolve({ auth: { client_token: 'approle-token' } }),
      });
      // Mock token verification
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'approle-token' } }),
      });

      await provider.connect();

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:8200/v1/auth/approle/login',
        expect.objectContaining({
          method: 'POST',
          // eslint-disable-next-line camelcase
          body: JSON.stringify({ role_id: 'role-id', secret_id: 'secret-id' }),
        }),
      );
    });

    test('throws VaultError on authentication failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({ errors: ['permission denied'] }),
      });

      await expect(provider.connect()).rejects.toThrow(VaultError);
    });

    test('includes namespace header when configured', async () => {
      config.namespace = 'test-ns';
      provider = new VaultProvider(config);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      await provider.connect();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Vault-Namespace': 'test-ns',
          }),
        }),
      );
    });
  });

  describe('#disconnect()', () => {
    test('clears token and cache', async () => {
      // First connect
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });
      await provider.connect();

      // Then fetch a secret to populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { data: { password: 'secret' } } }),
      });
      await provider.get({ path: 'secret/test' });

      await provider.disconnect();

      // Attempting to fetch again should fail
      await expect(provider.get({ path: 'secret/test' })).rejects.toThrow(
        'Not connected to Vault',
      );
    });
  });

  describe('#fetchSecret()', () => {
    beforeEach(async () => {
      // Connect first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });
      await provider.connect();
    });

    test('fetches KV v2 secret with normalized path', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              data: {
                password: 'secret123',
                username: 'testuser',
              },
            },
          }),
      });

      const result = await provider.fetchSecret({ path: 'secret/myapp' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8200/v1/secret/data/myapp',
        expect.any(Object),
      );
      expect(result).to.deep.equal({
        password: 'secret123',
        username: 'testuser',
      });
    });

    test('handles path that already contains /data/', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              data: {
                password: 'secret123',
              },
            },
          }),
      });

      await provider.fetchSecret({ path: 'secret/data/myapp' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8200/v1/secret/data/myapp',
        expect.any(Object),
      );
    });

    test('includes version parameter when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { data: {} } }),
      });

      await provider.fetchSecret({ path: 'secret/myapp', version: '3' });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8200/v1/secret/data/myapp?version=3',
        expect.any(Object),
      );
    });

    test('throws VaultError on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ errors: ['secret not found'] }),
      });

      await expect(
        provider.fetchSecret({ path: 'secret/nonexistent' }),
      ).rejects.toThrow(VaultError);
    });
  });

  describe('#get()', () => {
    beforeEach(async () => {
      // Connect first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });
      await provider.connect();

      // Mock secret fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              data: {
                password: 'secret123',
                username: 'testuser',
              },
            },
          }),
      });
    });

    test('returns entire secret when no key specified', async () => {
      const result = await provider.get({ path: 'secret/myapp' });
      expect(result).to.deep.equal({
        password: 'secret123',
        username: 'testuser',
      });
    });

    test('returns specific field when key specified', async () => {
      const result = await provider.get({
        path: 'secret/myapp',
        key: 'password',
      });
      expect(result).to.equal('secret123');
    });
  });
});
