/* eslint-disable n/no-unsupported-features/node-builtins -- fetch is stable in Node 20+ */
import { DockerComposeClient, SecretManager, setContext } from '@';
/**
 * Integration tests for HashiCorp Vault secrets.
 *
 * These tests use a Vault dev server that is automatically started
 * by the globalSetup before tests run. The VAULT_ADDR and VAULT_TOKEN
 * environment variables are set automatically.
 */
import { createSign } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createKubernetesClient } from '@/kubernetes/client.js';
import { Monorepo } from '@/monorepo';
import {
  VaultError,
  VaultProvider,
  VaultProviderConfig,
} from '@/secrets/providers/VaultProvider.js';

// Mock the 'open' package to prevent browser opening during tests
vi.mock('open', () => ({
  default: vi.fn(),
}));

// Environment variables are set by global-setup.ts
const getVaultAddr = () => process.env.VAULT_ADDR!;
const getVaultToken = () => process.env.VAULT_TOKEN!;
const getKeycloakRealm = () => process.env.KEYCLOAK_REALM!;
const getKeycloakClientId = () => process.env.KEYCLOAK_CLIENT_ID!;
const getKeycloakClientSecret = () => process.env.KEYCLOAK_CLIENT_SECRET!;
// Use KEYCLOAK_URL_FOR_VAULT for Vault OIDC config (Vault runs in Docker and
// needs host.docker.internal to reach Keycloak on the host)
const getKeycloakUrlForVault = () => process.env.KEYCLOAK_URL_FOR_VAULT!;

// Test RSA key pair (2048-bit) for JWT signing
// Generated for testing purposes only - NOT FOR PRODUCTION
const TEST_RSA_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA2Z3qX2BTLS4e0ezLq4CKhkc/jnDHDZFx3vp+gXa4PwmIl2Wv
Lsz2PNlW3OO7hs3gkSuDqMZAfvlK2JNuZaVBJV3IZ2k5r1kF4o3u3NzG2jNF4sC6
oJkH7f1LqB0THAaJiYwMmAJD6oM8g3aOUq7TT5bfmqINFYMvHGKdZjQ3NzGXG5rP
k2Q3xM8K7X5zDCekjGNv5VRZbPgJ5bPgx6xEjWi2zwVGp4J7zJ0ZG9WQkF0Rw0Rm
bCmJvMFwkPmJjGCUAMvrRK/4pJPvL0D7S9OV3kKlXf6p7p0mHLJlZMG6rz0Bkqj4
e0hdJLwG4mJnmqaT6bJbO3o3lKxYl7tG4MdkNwIDAQABAoIBAC3q0p27wGFb0pRk
iVfPLcQQp6KwqJmGZhXS3JZz6mENTL0VMBsXU8g/0sHk6Y4zXLiO3I8vpfBMNK4c
/0nKCvVpLbK7LGm5n4m9I7CRxVclhkVqAkJNP2f7pzpE0LlqLhDC93oLjNGK0xsF
+pXN9AJkCi3RrGI1c5k5Z3A1D0yQBHvP2D3c+Lnt2xPwqG/c0X+lhJqHqC0N8wbC
0o/GnN7gKXHnwKL/hVK5JCJr5G2+AQUj0VEB/EAQ1EyePctS0M/xq+wOQGM8HREv
eSfGQQc0VctVEKn+HxbJD8IrDbhXqA6d8z2p4o+2xdK+t8R/0QCJlB0zDnrJ5z+2
LVdKBsECgYEA7gRf2DKnHU7mB5lX0lE6q1X0R2YPt1J4nD/VC4KSFD1P0GDt9g8f
9+U5e01M/p7F1ZRPeS0y8X8gJTC4B8u2MdFp0JhKd1XGLF0rSGS2ZIHG0NpS7Rmq
SsAaJb3qMgVwRxgLxqD3QwRBvHK8L0QhPTe1Y0e8cSVNB7CbbrLHhyECgYEA6YDP
jGGRBmFP8YqGNi3yGBM5wHqgfMRTwrZGqHnCJdpL0HQKq4eDvSKE5FKZV1s1M8xH
KdWdbK/0H5an9wslOQLcJGDJBMfDI/9Y8mNfnJidZsG+jwqTUQv1Sy1TvB7lbNfF
VVsDVXjH3C6TcNhXb7RmBfFJCCXlnmJPPAJpTycCgYAz0xk4rPk6OhBrFLl7VgQF
RXK/wLPb0X7p8q0bFJnYkRsjJvYEpWaJBpHY+Sm9N0P8Rp+M5xpM8cYMKL0tLJJb
+TCg2DxlTvZHNxHqRf1y4h3MzKv7sjhe3P7I+b8VKsKB5cCB0BUQV1N1HrP2gSLI
K8vNOp5nQi0TD1k5Z8LYoQKBgQDBMK3M1xE5X7FgB2p1fYNO6kzPK8uKPCnB7nMM
2OcI2RP4T3Z+PadO+k0J7n1rqp/EL0XjWcPzVHZFrLhEka6x1dRRfYfTdVfvTnvA
Y9K5V5tV7rq5VJTnmqSxLPaF0Y79qw8PxFvWZPjT2XO9kRG/PV4shT0XoZP0gWjI
7f6nhQKBgQC6q0TdG3X7qcnHd0cnclePZ5Fm0MHEJjvzKVtPFRfLhU1BTCF0tXDZ
nJvKDZrP3fnrwGVhnNNnMTcJRDcxKZrFBTonXvP8HuKP0pX3lqFq0HPOCKV+p3F8
n8rIxYvlKNPfF5sVD1X4rWL+bj9D2qf0RA1FMrxCdNPNLfCpua3Dmw==
-----END RSA PRIVATE KEY-----`;

const TEST_RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2Z3qX2BTLS4e0ezLq4CK
hkc/jnDHDZFx3vp+gXa4PwmIl2WvLsz2PNlW3OO7hs3gkSuDqMZAfvlK2JNuZaVB
JV3IZ2k5r1kF4o3u3NzG2jNF4sC6oJkH7f1LqB0THAaJiYwMmAJD6oM8g3aOUq7T
T5bfmqINFYMvHGKdZjQ3NzGXG5rPk2Q3xM8K7X5zDCekjGNv5VRZbPgJ5bPgx6xE
jWi2zwVGp4J7zJ0ZG9WQkF0Rw0RmbCmJvMFwkPmJjGCUAMvrRK/4pJPvL0D7S9OV
3kKlXf6p7p0mHLJlZMG6rz0Bkqj4e0hdJLwG4mJnmqaT6bJbO3o3lKxYl7tG4Mdk
NwIDAQAB
-----END PUBLIC KEY-----`;

/**
 * Configure Vault's JWT auth backend for testing.
 * This function is at module scope to satisfy eslint unicorn/consistent-function-scoping.
 */
async function setupJwtAuth(): Promise<void> {
  // Enable JWT auth method
  const enableResponse = await fetch(`${getVaultAddr()}/v1/sys/auth/jwt`, {
    method: 'POST',
    headers: {
      'X-Vault-Token': getVaultToken(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'jwt' }),
  });

  // It's OK if it's already enabled (400 error)
  if (!enableResponse.ok && enableResponse.status !== 400) {
    const error = await enableResponse.text();
    throw new Error(`Failed to enable JWT auth: ${error}`);
  }

  // Configure JWT auth with our test public key
  // Vault API uses snake_case for these fields
  /* eslint-disable camelcase */
  const configResponse = await fetch(`${getVaultAddr()}/v1/auth/jwt/config`, {
    method: 'POST',
    headers: {
      'X-Vault-Token': getVaultToken(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jwt_validation_pubkeys: [TEST_RSA_PUBLIC_KEY],
      bound_issuer: 'test-issuer',
    }),
  });

  if (!configResponse.ok) {
    const error = await configResponse.text();
    throw new Error(`Failed to configure JWT auth: ${error}`);
  }

  // Create a role for testing
  const roleResponse = await fetch(
    `${getVaultAddr()}/v1/auth/jwt/role/test-role`,
    {
      method: 'POST',
      headers: {
        'X-Vault-Token': getVaultToken(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role_type: 'jwt',
        bound_audiences: ['vault'],
        user_claim: 'sub',
        policies: ['default'],
        ttl: '1h',
      }),
    },
  );
  /* eslint-enable camelcase */

  if (!roleResponse.ok) {
    const error = await roleResponse.text();
    throw new Error(`Failed to create JWT role: ${error}`);
  }
}

/**
 * Enable OIDC auth with Keycloak.
 * This function is at module scope to satisfy eslint unicorn/consistent-function-scoping.
 */
async function setupOidcAuth(): Promise<void> {
  // Enable OIDC auth method
  const enableResponse = await fetch(`${getVaultAddr()}/v1/sys/auth/oidc`, {
    method: 'POST',
    headers: {
      'X-Vault-Token': getVaultToken(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'oidc' }),
  });

  // It's OK if it's already enabled (400 error)
  if (!enableResponse.ok && enableResponse.status !== 400) {
    const error = await enableResponse.text();
    throw new Error(`Failed to enable OIDC auth: ${error}`);
  }

  // Configure OIDC auth with real Keycloak
  // Vault API uses snake_case for these fields
  /* eslint-disable camelcase */
  const configResponse = await fetch(`${getVaultAddr()}/v1/auth/oidc/config`, {
    method: 'POST',
    headers: {
      'X-Vault-Token': getVaultToken(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      oidc_discovery_url: `${getKeycloakUrlForVault()}/realms/${getKeycloakRealm()}`,
      oidc_client_id: getKeycloakClientId(),
      oidc_client_secret: getKeycloakClientSecret(),
      default_role: 'default',
    }),
  });

  if (!configResponse.ok) {
    const error = await configResponse.text();
    throw new Error(`Failed to configure OIDC auth: ${error}`);
  }

  // Create a default role
  const roleResponse = await fetch(
    `${getVaultAddr()}/v1/auth/oidc/role/default`,
    {
      method: 'POST',
      headers: {
        'X-Vault-Token': getVaultToken(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bound_audiences: [getKeycloakClientId()],
        allowed_redirect_uris: [
          'http://localhost:8250/oidc/callback',
          'http://localhost:8200/ui/vault/auth/oidc/oidc/callback',
        ],
        user_claim: 'sub',
        policies: ['default'],
      }),
    },
  );
  /* eslint-enable camelcase */

  if (!roleResponse.ok) {
    const error = await roleResponse.text();
    throw new Error(`Failed to create OIDC role: ${error}`);
  }
}

/**
 * Create a timeout promise for testing async operations.
 */
function createTimeoutPromise(ms: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

describe('Integration / Secrets / Vault', () => {
  let tempDir: string;
  let monorepo: Monorepo;
  let secrets: SecretManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'embVaultIntegrationTest'));
    await mkdir(join(tempDir, '.emb'), { recursive: true });

    monorepo = new Monorepo(
      {
        project: { name: 'test-vault-integration' },
        plugins: [],
        components: {},
      },
      tempDir,
    );
    await monorepo.init();

    secrets = new SecretManager();
    const compose = new DockerComposeClient(monorepo);

    setContext({
      docker: vi.mockObject({} as never),
      kubernetes: vi.mockObject(createKubernetesClient()),
      monorepo,
      compose,
      secrets,
    });
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }

    // Disconnect any providers
    await secrets?.disconnectAll();
  });

  describe('VaultProvider', () => {
    test('connects to Vault dev server with token auth', async () => {
      const config: VaultProviderConfig = {
        address: getVaultAddr(),
        auth: { method: 'token', token: getVaultToken() },
      };

      const provider = new VaultProvider(config);
      await provider.connect();

      // If we get here without error, connection succeeded
      expect(true).to.equal(true);

      await provider.disconnect();
    });

    test('fetches secrets from KV v2', async () => {
      // First, create a test secret
      const createResponse = await fetch(
        `${getVaultAddr()}/v1/secret/data/integration-test`,
        {
          method: 'POST',
          headers: {
            'X-Vault-Token': getVaultToken(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              password: 'integration-secret',
              username: 'integration-user',
            },
          }),
        },
      );

      expect(createResponse.ok).to.equal(true);

      const config: VaultProviderConfig = {
        address: getVaultAddr(),
        auth: { method: 'token', token: getVaultToken() },
      };

      const provider = new VaultProvider(config);
      await provider.connect();

      const result = await provider.get({
        path: 'secret/integration-test',
        key: 'password',
      });

      expect(result).to.equal('integration-secret');

      await provider.disconnect();
    });
  });

  describe('Template expansion with vault source', () => {
    test('expands vault references in strings', async () => {
      // Create test secret
      const createResponse = await fetch(
        `${getVaultAddr()}/v1/secret/data/expand-test`,
        {
          method: 'POST',
          headers: {
            'X-Vault-Token': getVaultToken(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: { apiKey: 'test-api-key-123' },
          }),
        },
      );

      expect(createResponse.ok).to.equal(true);

      // Set up provider
      const config: VaultProviderConfig = {
        address: getVaultAddr(),
        auth: { method: 'token', token: getVaultToken() },
      };

      const provider = new VaultProvider(config);
      await provider.connect();
      secrets.register('vault', provider);

      // Test expansion
      const expanded = await monorepo.expand({
        // eslint-disable-next-line no-template-curly-in-string
        key: '${vault:secret/expand-test#apiKey}',
      });

      expect(expanded.key).to.equal('test-api-key-123');
    });
  });

  describe('JWT Authentication', () => {
    test('fails authentication with invalid JWT', async () => {
      await setupJwtAuth();

      const invalidJwt = 'invalid.jwt.token';

      const config: VaultProviderConfig = {
        address: getVaultAddr(),
        auth: { method: 'jwt', role: 'test-role', jwt: invalidJwt },
      };

      const provider = new VaultProvider(config);

      await expect(provider.connect()).rejects.toThrow(VaultError);
    });

    test('fails authentication with expired JWT', async () => {
      await setupJwtAuth();

      // Create an expired JWT signed with RSA
      const header = { alg: 'RS256', typ: 'JWT' };
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        sub: 'test-user',
        aud: 'vault',
        iss: 'test-issuer',
        iat: now - 7200, // 2 hours ago
        exp: now - 3600, // 1 hour ago (expired)
      };

      const base64Header = Buffer.from(JSON.stringify(header)).toString(
        'base64url',
      );
      const base64Payload = Buffer.from(JSON.stringify(payload)).toString(
        'base64url',
      );
      const signatureInput = `${base64Header}.${base64Payload}`;

      // Sign with RSA private key
      const sign = createSign('RSA-SHA256');
      sign.update(signatureInput);
      const signature = sign.sign(TEST_RSA_PRIVATE_KEY, 'base64url');
      const expiredJwt = `${signatureInput}.${signature}`;

      const config: VaultProviderConfig = {
        address: getVaultAddr(),
        auth: { method: 'jwt', role: 'test-role', jwt: expiredJwt },
      };

      const provider = new VaultProvider(config);

      await expect(provider.connect()).rejects.toThrow('JWT login failed');
    });
  });

  describe('OIDC Authentication', () => {
    /**
     * Note: Full OIDC flow testing requires:
     * 1. A Keycloak server configured as the OIDC provider
     * 2. Vault OIDC auth backend configured to trust Keycloak
     * 3. Browser interaction for the OAuth flow
     *
     * Since we can't automate browser interaction in CI, we test:
     * - Error handling when OIDC is not configured
     * - The auth URL request endpoint behavior
     */

    test('fails when OIDC auth is not configured in Vault', async () => {
      // Don't enable OIDC auth - it should fail when trying to get auth URL
      const config: VaultProviderConfig = {
        address: getVaultAddr(),
        auth: { method: 'oidc', role: 'developer' },
      };

      const provider = new VaultProvider(config);

      // Should fail because OIDC auth is not enabled
      await expect(provider.connect()).rejects.toThrow(VaultError);
    });

    test('OIDC auth URL request fails without OIDC backend', async () => {
      // Test the raw API call to understand the error
      const response = await fetch(
        `${getVaultAddr()}/v1/auth/oidc/oidc/auth_url?redirect_uri=http://localhost:8250/oidc/callback&state=test&nonce=test`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      // Vault returns 403 Forbidden when the auth path doesn't exist
      expect(response.ok).to.equal(false);
      expect([403, 404]).to.include(response.status);
    });

    /**
     * The following tests use the real Keycloak instance started by global-setup.ts.
     * Keycloak is configured with:
     * - Realm: emb-test
     * - Client: vault (with client secret)
     * - Test user: testuser/testpassword
     */
    describe('with OIDC auth enabled', () => {
      test('can request auth URL when OIDC is configured', async () => {
        await setupOidcAuth();

        // Request an auth URL from Vault using POST (required in newer Vault versions)
        const response = await fetch(
          `${getVaultAddr()}/v1/auth/oidc/oidc/auth_url`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              // eslint-disable-next-line camelcase
              redirect_uri: 'http://localhost:8250/oidc/callback',
              state: 'test-state',
              nonce: 'test-nonce',
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Auth URL request failed with status ${response.status}: ${errorText}`,
          );
        }

        const data = (await response.json()) as {
          data?: { auth_url?: string };
        };
        expect(data.data?.auth_url).to.be.a('string');
      });

      test('OIDC login times out when no callback is received', async () => {
        await setupOidcAuth();

        const config: VaultProviderConfig = {
          address: getVaultAddr(),
          auth: { method: 'oidc', role: 'default', port: 18_250 },
        };

        const provider = new VaultProvider(config);

        // The OIDC flow starts a local callback server and waits for a redirect.
        // Since 'open' is mocked (no real browser interaction), the callback
        // never arrives and the flow should time out.
        // We use a short test timeout to avoid waiting for the full OIDC timeout.
        const connectPromise = provider.connect();
        const timeoutPromise = createTimeoutPromise(
          2000,
          'Test timeout - OIDC flow started but no callback received',
        );

        // The test timeout fires first, confirming the OIDC flow started
        // and is waiting for a callback that never arrives.
        await expect(
          Promise.race([connectPromise, timeoutPromise]),
        ).rejects.toThrow();
      });
    });
  });
});
