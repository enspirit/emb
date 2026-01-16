/* eslint-disable n/no-unsupported-features/node-builtins -- fetch is stable in Node 20+ */
/* eslint-disable mocha/no-top-level-hooks -- hooks are inside describe.skipIf which linter doesn't recognize */
import { DockerComposeClient, SecretManager, setContext } from '@';
/**
 * Integration tests for HashiCorp Vault secrets.
 *
 * These tests require a running Vault dev server:
 *   docker run -d --name vault-test -p 8200:8200 \
 *     -e 'VAULT_DEV_ROOT_TOKEN_ID=test-token' \
 *     hashicorp/vault server -dev
 *
 * To set up test secrets:
 *   export VAULT_ADDR=http://localhost:8200
 *   export VAULT_TOKEN=test-token
 *   vault kv put secret/test password=secret123 username=testuser
 *
 * Run integration tests:
 *   VAULT_ADDR=http://localhost:8200 VAULT_TOKEN=test-token npm run test:integration
 */
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';

import { createKubernetesClient } from '@/kubernetes/client.js';
import { Monorepo } from '@/monorepo';
import {
  VaultProvider,
  VaultProviderConfig,
} from '@/secrets/providers/VaultProvider.js';

// Skip tests if Vault is not configured
const { VAULT_ADDR } = process.env;
const { VAULT_TOKEN } = process.env;
const VAULT_AVAILABLE = Boolean(VAULT_ADDR && VAULT_TOKEN);

// Helper to check if Vault is reachable
async function isVaultReachable(): Promise<boolean> {
  if (!VAULT_AVAILABLE) {
    return false;
  }

  try {
    const response = await fetch(`${VAULT_ADDR}/v1/sys/health`, {
      method: 'GET',
    });
    return response.ok || response.status === 429; // 429 = standby node
  } catch {
    return false;
  }
}

describe.skipIf(!VAULT_AVAILABLE)('Integration / Secrets / Vault', () => {
  let tempDir: string;
  let monorepo: Monorepo;
  let secrets: SecretManager;
  let vaultReachable: boolean;

  beforeAll(async () => {
    vaultReachable = await isVaultReachable();
    if (!vaultReachable) {
      console.warn(
        'Vault is not reachable. Start a dev server to run integration tests:\n' +
          '  docker run -d --name vault-test -p 8200:8200 ' +
          "-e 'VAULT_DEV_ROOT_TOKEN_ID=test-token' hashicorp/vault server -dev",
      );
    }
  });

  beforeEach(async () => {
    if (!vaultReachable) {
      return;
    }

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
    test.skipIf(!VAULT_AVAILABLE)(
      'connects to Vault dev server with token auth',
      async () => {
        const config: VaultProviderConfig = {
          address: VAULT_ADDR!,
          auth: { method: 'token', token: VAULT_TOKEN! },
        };

        const provider = new VaultProvider(config);
        await provider.connect();

        // If we get here without error, connection succeeded
        expect(true).to.equal(true);

        await provider.disconnect();
      },
    );

    test.skipIf(!VAULT_AVAILABLE)('fetches secrets from KV v2', async () => {
      // First, create a test secret
      const createResponse = await fetch(
        `${VAULT_ADDR}/v1/secret/data/integration-test`,
        {
          method: 'POST',
          headers: {
            'X-Vault-Token': VAULT_TOKEN!,
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

      if (!createResponse.ok) {
        console.warn('Could not create test secret. Skipping test.');
        return;
      }

      const config: VaultProviderConfig = {
        address: VAULT_ADDR!,
        auth: { method: 'token', token: VAULT_TOKEN! },
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
    test.skipIf(!VAULT_AVAILABLE)(
      'expands vault references in strings',
      async () => {
        // Create test secret
        await fetch(`${VAULT_ADDR}/v1/secret/data/expand-test`, {
          method: 'POST',
          headers: {
            'X-Vault-Token': VAULT_TOKEN!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: { apiKey: 'test-api-key-123' },
          }),
        });

        // Set up provider
        const config: VaultProviderConfig = {
          address: VAULT_ADDR!,
          auth: { method: 'token', token: VAULT_TOKEN! },
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
      },
    );
  });
});
