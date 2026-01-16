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
      const originalJwt = process.env.VAULT_JWT;
      const originalJwtRole = process.env.VAULT_JWT_ROLE;
      const originalOidcRole = process.env.VAULT_OIDC_ROLE;

      delete process.env.VAULT_TOKEN;
      delete process.env.VAULT_ROLE_ID;
      delete process.env.VAULT_SECRET_ID;
      delete process.env.VAULT_K8S_ROLE;
      delete process.env.VAULT_JWT;
      delete process.env.VAULT_JWT_ROLE;
      delete process.env.VAULT_OIDC_ROLE;

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
      process.env.VAULT_JWT = originalJwt;
      process.env.VAULT_JWT_ROLE = originalJwtRole;
      process.env.VAULT_OIDC_ROLE = originalOidcRole;
    });

    test('uses VAULT_JWT and VAULT_JWT_ROLE from environment when auth not specified', async () => {
      const originalToken = process.env.VAULT_TOKEN;
      const originalRoleId = process.env.VAULT_ROLE_ID;
      const originalSecretId = process.env.VAULT_SECRET_ID;
      const originalK8sRole = process.env.VAULT_K8S_ROLE;
      const originalJwt = process.env.VAULT_JWT;
      const originalJwtRole = process.env.VAULT_JWT_ROLE;

      delete process.env.VAULT_TOKEN;
      delete process.env.VAULT_ROLE_ID;
      delete process.env.VAULT_SECRET_ID;
      delete process.env.VAULT_K8S_ROLE;
      process.env.VAULT_JWT = 'env-jwt-token';
      process.env.VAULT_JWT_ROLE = 'ci-runner';

      const config: VaultPluginConfig = {
        address: 'http://localhost:8200',
      };

      // Mock JWT login
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          // eslint-disable-next-line camelcase -- Vault API uses snake_case
          Promise.resolve({ auth: { client_token: 'jwt-vault-token' } }),
      });
      // Mock token verification
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      const plugin = new VaultPlugin(config, setup.monorepo);
      await plugin.init();

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:8200/v1/auth/jwt/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ role: 'ci-runner', jwt: 'env-jwt-token' }),
        }),
      );

      process.env.VAULT_TOKEN = originalToken;
      process.env.VAULT_ROLE_ID = originalRoleId;
      process.env.VAULT_SECRET_ID = originalSecretId;
      process.env.VAULT_K8S_ROLE = originalK8sRole;
      process.env.VAULT_JWT = originalJwt;
      process.env.VAULT_JWT_ROLE = originalJwtRole;
    });

    test('VAULT_OIDC_ROLE env var is detected for auth resolution', async () => {
      // This test verifies that VAULT_OIDC_ROLE env var is detected by the plugin
      // The actual OIDC flow is interactive (opens browser) and can't be unit tested
      // So we just verify the config doesn't throw "authentication not configured"
      // when VAULT_OIDC_ROLE is set - it will fail later trying to open browser
      const originalToken = process.env.VAULT_TOKEN;
      const originalRoleId = process.env.VAULT_ROLE_ID;
      const originalSecretId = process.env.VAULT_SECRET_ID;
      const originalK8sRole = process.env.VAULT_K8S_ROLE;
      const originalJwt = process.env.VAULT_JWT;
      const originalJwtRole = process.env.VAULT_JWT_ROLE;
      const originalOidcRole = process.env.VAULT_OIDC_ROLE;

      delete process.env.VAULT_TOKEN;
      delete process.env.VAULT_ROLE_ID;
      delete process.env.VAULT_SECRET_ID;
      delete process.env.VAULT_K8S_ROLE;
      delete process.env.VAULT_JWT;
      delete process.env.VAULT_JWT_ROLE;
      process.env.VAULT_OIDC_ROLE = 'developer';

      const config: VaultPluginConfig = {
        address: 'http://localhost:8200',
      };

      const plugin = new VaultPlugin(config, setup.monorepo);
      // The init will fail during OIDC flow (trying to get auth URL or open browser)
      // but it should NOT fail with "authentication not configured"
      const initPromise = plugin.init();
      await expect(initPromise).rejects.not.toThrow(
        'Vault authentication not configured',
      );

      process.env.VAULT_TOKEN = originalToken;
      process.env.VAULT_ROLE_ID = originalRoleId;
      process.env.VAULT_SECRET_ID = originalSecretId;
      process.env.VAULT_K8S_ROLE = originalK8sRole;
      process.env.VAULT_JWT = originalJwt;
      process.env.VAULT_JWT_ROLE = originalJwtRole;
      process.env.VAULT_OIDC_ROLE = originalOidcRole;
    });
  });
});
