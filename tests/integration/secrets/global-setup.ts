/* eslint-disable n/no-unsupported-features/node-builtins -- fetch is stable in Node 20+ */
/**
 * Global setup for Vault and Keycloak integration tests.
 *
 * Starts:
 * - HashiCorp Vault dev server
 * - Keycloak server for OIDC testing
 *
 * This ensures integration tests always have working Vault and Keycloak instances.
 */
import { execa } from 'execa';

const DOCKER_NETWORK_NAME = 'emb-test-network';

const VAULT_CONTAINER_NAME = 'emb-vault-test';
const VAULT_PORT = '8200';
const VAULT_TOKEN = 'test-token';

const KEYCLOAK_CONTAINER_NAME = 'emb-keycloak-test';
const KEYCLOAK_PORT = '8080';
const KEYCLOAK_ADMIN_USER = 'admin';
const KEYCLOAK_ADMIN_PASSWORD = 'admin';

// Keycloak realm and client configuration
const KEYCLOAK_REALM = 'emb-test';
const KEYCLOAK_CLIENT_ID = 'vault';
const KEYCLOAK_CLIENT_SECRET = 'vault-secret';

export default async function globalSetup() {
  // Create Docker network for container communication
  await createNetwork();

  // Start both containers on the shared network
  await startVault();
  await startKeycloak();

  // Configure Keycloak with a test realm and client
  await configureKeycloak();

  // Set environment variables for tests
  process.env.VAULT_ADDR = `http://localhost:${VAULT_PORT}`;
  process.env.VAULT_TOKEN = VAULT_TOKEN;
  // KEYCLOAK_URL is for test code running on host
  process.env.KEYCLOAK_URL = `http://localhost:${KEYCLOAK_PORT}`;
  // KEYCLOAK_URL_FOR_VAULT is for Vault (running in Docker) to reach Keycloak
  // Uses container name which works via Docker network on all platforms
  process.env.KEYCLOAK_URL_FOR_VAULT = `http://${KEYCLOAK_CONTAINER_NAME}:8080`;
  process.env.KEYCLOAK_REALM = KEYCLOAK_REALM;
  process.env.KEYCLOAK_CLIENT_ID = KEYCLOAK_CLIENT_ID;
  process.env.KEYCLOAK_CLIENT_SECRET = KEYCLOAK_CLIENT_SECRET;

  // Return teardown function
  return async () => {
    console.log('[Test Teardown] Stopping containers...');
    try {
      await execa(
        'docker',
        ['rm', '-f', VAULT_CONTAINER_NAME, KEYCLOAK_CONTAINER_NAME],
        { stdio: 'pipe' },
      );
      console.log('[Test Teardown] Containers stopped');
    } catch (error) {
      console.error('[Test Teardown] Failed to stop containers:', error);
    }

    // Remove Docker network
    try {
      await execa('docker', ['network', 'rm', DOCKER_NETWORK_NAME], {
        stdio: 'pipe',
      });
      console.log('[Test Teardown] Network removed');
    } catch {
      // Network might not exist or might have other containers, that's fine
    }
  };
}

async function createNetwork(): Promise<void> {
  console.log('[Network Setup] Creating Docker network...');

  // Remove existing network first (ignore errors if it doesn't exist)
  try {
    await execa('docker', ['network', 'rm', DOCKER_NETWORK_NAME], {
      stdio: 'pipe',
    });
  } catch {
    // Network might not exist, that's fine
  }

  // Create the network
  try {
    await execa('docker', ['network', 'create', DOCKER_NETWORK_NAME], {
      stdio: 'pipe',
    });
    console.log('[Network Setup] Docker network created');
  } catch (error) {
    console.error('[Network Setup] Failed to create network:', error);
    throw error;
  }
}

async function startVault(): Promise<void> {
  console.log('[Vault Setup] Starting Vault dev server...');

  // Stop any existing container first
  try {
    await execa('docker', ['rm', '-f', VAULT_CONTAINER_NAME], {
      stdio: 'pipe',
    });
  } catch {
    // Container might not exist, that's fine
  }

  // Start Vault dev server on the shared network
  try {
    await execa(
      'docker',
      [
        'run',
        '-d',
        '--name',
        VAULT_CONTAINER_NAME,
        '--network',
        DOCKER_NETWORK_NAME,
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

    console.log('[Vault Setup] Vault dev server is ready');
  } catch (error) {
    console.error('[Vault Setup] Failed to start Vault:', error);
    throw error;
  }
}

async function startKeycloak(): Promise<void> {
  console.log('[Keycloak Setup] Starting Keycloak server...');

  // Stop any existing container first
  try {
    await execa('docker', ['rm', '-f', KEYCLOAK_CONTAINER_NAME], {
      stdio: 'pipe',
    });
  } catch {
    // Container might not exist, that's fine
  }

  // Start Keycloak in dev mode on the shared network
  // Note: KC_HOSTNAME_STRICT=false and KC_HOSTNAME_STRICT_HTTPS=false are required
  // for Keycloak 24+ to allow HTTP connections in dev mode
  try {
    await execa(
      'docker',
      [
        'run',
        '-d',
        '--name',
        KEYCLOAK_CONTAINER_NAME,
        '--network',
        DOCKER_NETWORK_NAME,
        '-p',
        `${KEYCLOAK_PORT}:8080`,
        '-e',
        `KEYCLOAK_ADMIN=${KEYCLOAK_ADMIN_USER}`,
        '-e',
        `KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_ADMIN_PASSWORD}`,
        '-e',
        'KC_HOSTNAME_STRICT=false',
        '-e',
        'KC_HOSTNAME_STRICT_HTTPS=false',
        '-e',
        'KC_HTTP_ENABLED=true',
        'quay.io/keycloak/keycloak:latest',
        'start-dev',
      ],
      { stdio: 'inherit' },
    );

    // Wait for Keycloak to be ready
    await waitForKeycloak();

    console.log('[Keycloak Setup] Keycloak server is ready');
  } catch (error) {
    console.error('[Keycloak Setup] Failed to start Keycloak:', error);
    throw error;
  }
}

async function configureKeycloak(): Promise<void> {
  console.log('[Keycloak Setup] Configuring realm and client...');

  const keycloakUrl = `http://localhost:${KEYCLOAK_PORT}`;

  // Get admin access token
  // OAuth2 standard requires snake_case field names
  /* eslint-disable camelcase */
  const tokenResponse = await fetch(
    `${keycloakUrl}/realms/master/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: KEYCLOAK_ADMIN_USER,
        password: KEYCLOAK_ADMIN_PASSWORD,
      }),
    },
  );
  /* eslint-enable camelcase */

  if (!tokenResponse.ok) {
    throw new Error(
      `Failed to get Keycloak admin token: ${await tokenResponse.text()}`,
    );
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string };
  const adminToken = tokenData.access_token;

  // Create the test realm
  const realmResponse = await fetch(`${keycloakUrl}/admin/realms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      realm: KEYCLOAK_REALM,
      enabled: true,
      registrationAllowed: false,
      loginWithEmailAllowed: true,
      duplicateEmailsAllowed: false,
      resetPasswordAllowed: false,
      editUsernameAllowed: false,
      bruteForceProtected: false,
    }),
  });

  // 409 means realm already exists, which is fine
  if (!realmResponse.ok && realmResponse.status !== 409) {
    throw new Error(
      `Failed to create Keycloak realm: ${await realmResponse.text()}`,
    );
  }

  // Create the Vault client
  const clientResponse = await fetch(
    `${keycloakUrl}/admin/realms/${KEYCLOAK_REALM}/clients`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        clientId: KEYCLOAK_CLIENT_ID,
        enabled: true,
        protocol: 'openid-connect',
        publicClient: false,
        secret: KEYCLOAK_CLIENT_SECRET,
        redirectUris: [
          'http://localhost:8250/oidc/callback',
          'http://localhost:8200/ui/vault/auth/oidc/oidc/callback',
          `http://localhost:${VAULT_PORT}/v1/auth/oidc/oidc/callback`,
        ],
        webOrigins: ['+'],
        standardFlowEnabled: true,
        directAccessGrantsEnabled: true,
        serviceAccountsEnabled: true,
        authorizationServicesEnabled: false,
        attributes: {
          'pkce.code.challenge.method': 'S256',
        },
      }),
    },
  );

  // 409 means client already exists, which is fine
  if (!clientResponse.ok && clientResponse.status !== 409) {
    throw new Error(
      `Failed to create Keycloak client: ${await clientResponse.text()}`,
    );
  }

  // Create a test user
  const userResponse = await fetch(
    `${keycloakUrl}/admin/realms/${KEYCLOAK_REALM}/users`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        username: 'testuser',
        email: 'testuser@example.com',
        enabled: true,
        emailVerified: true,
        credentials: [
          {
            type: 'password',
            value: 'testpassword',
            temporary: false,
          },
        ],
      }),
    },
  );

  // 409 means user already exists, which is fine
  if (!userResponse.ok && userResponse.status !== 409) {
    throw new Error(
      `Failed to create Keycloak user: ${await userResponse.text()}`,
    );
  }

  console.log('[Keycloak Setup] Realm and client configured');
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
      await sleep(delayMs);
    }
  }
  /* eslint-enable no-await-in-loop */

  throw new Error(
    `Vault did not become ready after ${maxAttempts} attempts (${(maxAttempts * delayMs) / 1000}s)`,
  );
}

async function waitForKeycloak(
  maxAttempts = 60,
  delayMs = 1000,
): Promise<void> {
  const keycloakUrl = `http://localhost:${KEYCLOAK_PORT}`;

  // Sequential polling is intentional - we need to wait between attempts
  // Note: We check the master realm endpoint because /health/ready requires
  // explicit configuration in Keycloak 20+
  /* eslint-disable no-await-in-loop */
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${keycloakUrl}/realms/master`, {
        method: 'GET',
      });

      if (response.ok) {
        return;
      }
    } catch {
      // Connection refused or other error, keep trying
    }

    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }
  /* eslint-enable no-await-in-loop */

  throw new Error(
    `Keycloak did not become ready after ${maxAttempts} attempts (${(maxAttempts * delayMs) / 1000}s)`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
