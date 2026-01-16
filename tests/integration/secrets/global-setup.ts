/* eslint-disable n/no-unsupported-features/node-builtins -- fetch is stable in Node 20+ */
/**
 * Global setup for Vault integration tests.
 *
 * Starts a HashiCorp Vault dev server before tests and tears it down after.
 * This ensures integration tests always have a working Vault instance.
 */
import { execa } from 'execa';

const VAULT_CONTAINER_NAME = 'emb-vault-test';
const VAULT_PORT = '8200';
const VAULT_TOKEN = 'test-token';

export default async function globalSetup() {
  console.log('[Vault Test Setup] Starting Vault dev server...');

  // Stop any existing container first
  try {
    await execa('docker', ['rm', '-f', VAULT_CONTAINER_NAME], {
      stdio: 'pipe',
    });
  } catch {
    // Container might not exist, that's fine
  }

  // Start Vault dev server
  try {
    await execa(
      'docker',
      [
        'run',
        '-d',
        '--name',
        VAULT_CONTAINER_NAME,
        '-p',
        `${VAULT_PORT}:8200`,
        '-e',
        `VAULT_DEV_ROOT_TOKEN_ID=${VAULT_TOKEN}`,
        '-e',
        'VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200',
        'hashicorp/vault:latest',
        'server',
        '-dev',
      ],
      { stdio: 'inherit' },
    );

    // Wait for Vault to be ready
    await waitForVault();

    console.log('[Vault Test Setup] Vault dev server is ready');
  } catch (error) {
    console.error('[Vault Test Setup] Failed to start Vault:', error);
    throw error;
  }

  // Set environment variables for tests
  process.env.VAULT_ADDR = `http://localhost:${VAULT_PORT}`;
  process.env.VAULT_TOKEN = VAULT_TOKEN;

  // Return teardown function
  return async () => {
    console.log('[Vault Test Teardown] Stopping Vault dev server...');
    try {
      await execa('docker', ['rm', '-f', VAULT_CONTAINER_NAME], {
        stdio: 'pipe',
      });
      console.log('[Vault Test Teardown] Vault dev server stopped');
    } catch (error) {
      console.error('[Vault Test Teardown] Failed to stop Vault:', error);
    }
  };
}

async function waitForVault(maxAttempts = 30, delayMs = 500): Promise<void> {
  const vaultAddr = `http://localhost:${VAULT_PORT}`;

  // Sequential polling is intentional - we need to wait between attempts
  /* eslint-disable no-await-in-loop */
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${vaultAddr}/v1/sys/health`, {
        method: 'GET',
      });

      // Vault returns 200 for initialized & unsealed, 429 for standby
      if (response.ok || response.status === 429) {
        return;
      }
    } catch {
      // Connection refused or other error, keep trying
    }

    if (attempt < maxAttempts) {
      await delay(delayMs);
    }
  }
  /* eslint-enable no-await-in-loop */

  throw new Error(
    `Vault did not become ready after ${maxAttempts} attempts (${(maxAttempts * delayMs) / 1000}s)`,
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
