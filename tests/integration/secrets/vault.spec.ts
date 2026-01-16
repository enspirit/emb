/* eslint-disable n/no-unsupported-features/node-builtins -- fetch is stable in Node 20+ */
import { DockerComposeClient, SecretManager, setContext } from '@';
/**
 * Integration tests for HashiCorp Vault secrets.
 *
 * These tests use a Vault dev server that is automatically started
 * by the globalSetup before tests run. The VAULT_ADDR and VAULT_TOKEN
 * environment variables are set automatically.
 */
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createKubernetesClient } from '@/kubernetes/client.js';
import { Monorepo } from '@/monorepo';
import {
  VaultProvider,
  VaultProviderConfig,
} from '@/secrets/providers/VaultProvider.js';

// Environment variables are set by global-setup.ts
const getVaultAddr = () => process.env.VAULT_ADDR!;
const getVaultToken = () => process.env.VAULT_TOKEN!;

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
});
