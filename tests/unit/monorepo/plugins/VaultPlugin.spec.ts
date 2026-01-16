/* eslint-disable n/no-unsupported-features/node-builtins -- fetch is stable in Node 20+ */
import { VaultPlugin, VaultPluginConfig } from '@';
import { createTestSetup, TestSetup } from 'tests/setup/set.context.js';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('Monorepo / Plugins / VaultPlugin', () => {
  let setup: TestSetup;

  beforeEach(async () => {
    mockFetch.mockReset();
    setup = await createTestSetup({
      tempDirPrefix: 'embVaultPluginTest',
      embfile: { project: { name: 'test-vault' }, plugins: [], components: {} },
    });
  });

  afterEach(async () => {
    await setup.cleanup();
    vi.restoreAllMocks();
  });

  describe('#init()', () => {
    test('connects to vault and registers provider', async () => {
      const config: VaultPluginConfig = {
        address: 'http://localhost:8200',
        auth: { method: 'token', token: 'test-token' },
      };

      // Mock token verification
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'test-token' } }),
      });

      const plugin = new VaultPlugin(config, setup.monorepo);
      await plugin.init();

      expect(setup.secrets.has('vault')).to.equal(true);
    });

    test('uses VAULT_ADDR from environment when address not specified', async () => {
      const originalEnv = process.env.VAULT_ADDR;
      process.env.VAULT_ADDR = 'http://env-vault:8200';

      const config: VaultPluginConfig = {
        auth: { method: 'token', token: 'test-token' },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      const plugin = new VaultPlugin(config, setup.monorepo);
      await plugin.init();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://env-vault:8200'),
        expect.any(Object),
      );

      process.env.VAULT_ADDR = originalEnv;
    });

    test('uses VAULT_TOKEN from environment when auth not specified', async () => {
      const originalToken = process.env.VAULT_TOKEN;
      process.env.VAULT_TOKEN = 'env-token';

      const config: VaultPluginConfig = {
        address: 'http://localhost:8200',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      const plugin = new VaultPlugin(config, setup.monorepo);
      await plugin.init();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Vault-Token': 'env-token',
          }),
        }),
      );

      process.env.VAULT_TOKEN = originalToken;
    });

    test('throws error when vault address not configured', async () => {
      const originalEnv = process.env.VAULT_ADDR;
      delete process.env.VAULT_ADDR;

      const config: VaultPluginConfig = {
        auth: { method: 'token', token: 'test-token' },
      };

      const plugin = new VaultPlugin(config, setup.monorepo);
      await expect(plugin.init()).rejects.toThrow(
        'Vault address not configured',
      );

      process.env.VAULT_ADDR = originalEnv;
    });

    test('throws error when authentication not configured', async () => {
      const originalToken = process.env.VAULT_TOKEN;
      const originalRoleId = process.env.VAULT_ROLE_ID;
      const originalSecretId = process.env.VAULT_SECRET_ID;
      const originalK8sRole = process.env.VAULT_K8S_ROLE;

      delete process.env.VAULT_TOKEN;
      delete process.env.VAULT_ROLE_ID;
      delete process.env.VAULT_SECRET_ID;
      delete process.env.VAULT_K8S_ROLE;

      const config: VaultPluginConfig = {
        address: 'http://localhost:8200',
      };

      const plugin = new VaultPlugin(config, setup.monorepo);
      await expect(plugin.init()).rejects.toThrow(
        'Vault authentication not configured',
      );

      process.env.VAULT_TOKEN = originalToken;
      process.env.VAULT_ROLE_ID = originalRoleId;
      process.env.VAULT_SECRET_ID = originalSecretId;
      process.env.VAULT_K8S_ROLE = originalK8sRole;
    });
  });
});
