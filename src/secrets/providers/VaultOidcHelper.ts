/* eslint-disable n/no-unsupported-features/node-builtins -- fetch is stable in Node 20+ */
import { randomBytes } from 'node:crypto';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { URL, URLSearchParams } from 'node:url';

import { VaultError } from './VaultProvider.js';

/**
 * Options for the OIDC login flow.
 */
export interface OidcLoginOptions {
  /** Vault namespace (optional) */
  namespace?: string;
  /** Local port for the callback server (default: 8250) */
  port?: number;
  /** OIDC role to authenticate as (optional, uses default role if omitted) */
  role?: string;
  /** Timeout in milliseconds for the login flow (default: 120000 = 2 minutes) */
  timeout?: number;
  /** Vault server address */
  vaultAddress: string;
}

/**
 * Response from Vault's OIDC auth URL endpoint.
 */
interface OidcAuthUrlResponse {
  data?: {
    auth_url?: string;
  };
  errors?: string[];
}

/**
 * Result of an OIDC login.
 */
export interface OidcLoginResult {
  /** The Vault client token */
  token: string;
  /** Token TTL in seconds */
  ttlSeconds: number;
}

/**
 * Perform an interactive OIDC login with Vault.
 *
 * This function:
 * 1. Starts a local HTTP server to receive the callback
 * 2. Requests an OIDC auth URL from Vault
 * 3. Opens the user's browser to the auth URL
 * 4. Waits for the callback with the Vault token
 * 5. Returns the token and TTL
 *
 * @param options - OIDC login options
 * @returns The Vault client token and TTL
 * @throws VaultError if the login fails
 */
export async function performOidcLogin(
  options: OidcLoginOptions,
): Promise<OidcLoginResult> {
  const { vaultAddress, role, namespace, timeout = 120_000 } = options;
  const port = options.port ?? 8250;
  const callbackUrl = `http://localhost:${port}/oidc/callback`;

  // Generate a random state and nonce for security
  const state = randomBytes(16).toString('hex');
  const nonce = randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | undefined;
    let server: ReturnType<typeof createServer> | undefined;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      if (server) {
        server.close();
        server = undefined;
      }
    };

    // Set up timeout
    timeoutId = setTimeout(() => {
      cleanup();
      reject(
        new VaultError(
          'OIDC login timed out. Please try again.',
          'VAULT_AUTH_ERROR',
        ),
      );
    }, timeout);

    // Create the callback server
    server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || '/', `http://localhost:${port}`);

      if (url.pathname === '/oidc/callback') {
        // Check for errors in callback
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          sendHtmlResponse(
            res,
            'Login Failed',
            `<p>Error: ${error}</p><p>${errorDescription || ''}</p>`,
          );
          cleanup();
          reject(
            new VaultError(
              `OIDC login failed: ${error} - ${errorDescription || 'Unknown error'}`,
              'VAULT_AUTH_ERROR',
            ),
          );
          return;
        }

        // Extract the code from the callback
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');

        if (!code) {
          sendHtmlResponse(
            res,
            'Login Failed',
            '<p>No authorization code received.</p>',
          );
          cleanup();
          reject(
            new VaultError(
              'OIDC login failed: No authorization code received',
              'VAULT_AUTH_ERROR',
            ),
          );
          return;
        }

        // Note: We don't validate state client-side because Vault generates
        // its own state (prefixed with 'st_') regardless of what we send.
        // Vault validates the state internally when we call the callback endpoint.

        try {
          // Exchange the code for a Vault token
          // Pass the returned state/nonce from Keycloak (which are Vault's values)
          const returnedNonce = url.searchParams.get('nonce') || nonce;
          const result = await exchangeCodeForToken({
            vaultAddress,
            role,
            namespace,
            code,
            state: returnedState || state,
            nonce: returnedNonce,
          });

          sendHtmlResponse(
            res,
            'Login Successful',
            '<p>You have been authenticated. You may close this window.</p>',
          );
          cleanup();
          resolve(result);
        } catch (error_) {
          const errorMessage =
            error_ instanceof Error ? error_.message : 'Unknown error';
          sendHtmlResponse(
            res,
            'Login Failed',
            `<p>Failed to complete authentication: ${errorMessage}</p>`,
          );
          cleanup();
          reject(error_);
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    server.on('error', (err: Error) => {
      cleanup();
      reject(
        new VaultError(
          `Failed to start callback server: ${err.message}`,
          'VAULT_AUTH_ERROR',
        ),
      );
    });

    server.listen(port, 'localhost', async () => {
      try {
        // Get the OIDC auth URL from Vault
        const authUrl = await getOidcAuthUrl({
          vaultAddress,
          role,
          namespace,
          redirectUri: callbackUrl,
          state,
          nonce,
        });

        // Open the browser
        const open = (await import('open')).default;
        await open(authUrl);

        console.log('Opening browser for authentication...');

        console.log(`If the browser doesn't open, navigate to:\n${authUrl}`);
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  });
}

/**
 * Get the OIDC auth URL from Vault.
 */
async function getOidcAuthUrl(options: {
  vaultAddress: string;
  role?: string;
  namespace?: string;
  redirectUri: string;
  state: string;
  nonce: string;
}): Promise<string> {
  const { vaultAddress, role, namespace, redirectUri, state, nonce } = options;

  const url = new URL('/v1/auth/oidc/oidc/auth_url', vaultAddress);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (namespace) {
    headers['X-Vault-Namespace'] = namespace;
  }

  // Build the request body
  // Vault API uses snake_case for these parameters
  /* eslint-disable camelcase */
  const body: Record<string, string> = {
    redirect_uri: redirectUri,
    state,
    nonce,
  };

  if (role) {
    body.role = role;
  }
  /* eslint-enable camelcase */

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      errors?: string[];
    };
    const errorMessage = data.errors?.join(', ') || `HTTP ${response.status}`;
    throw new VaultError(
      `Failed to get OIDC auth URL: ${errorMessage}`,
      'VAULT_AUTH_ERROR',
      response.status,
    );
  }

  const data = (await response.json()) as OidcAuthUrlResponse;
  const authUrl = data.data?.auth_url;

  if (!authUrl) {
    throw new VaultError(
      'Vault did not return an OIDC auth URL',
      'VAULT_AUTH_ERROR',
    );
  }

  return authUrl;
}

/**
 * Exchange the authorization code for a Vault token.
 */
async function exchangeCodeForToken(options: {
  vaultAddress: string;
  role?: string;
  namespace?: string;
  code: string;
  state: string;
  nonce: string;
}): Promise<OidcLoginResult> {
  const { vaultAddress, role, namespace, code, state, nonce } = options;

  const url = new URL('/v1/auth/oidc/oidc/callback', vaultAddress);
  const params = new URLSearchParams({
    code,
    state,
    nonce,
  });

  if (role) {
    params.set('role', role);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (namespace) {
    headers['X-Vault-Namespace'] = namespace;
  }

  const response = await fetch(`${url.toString()}?${params.toString()}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      errors?: string[];
    };
    const errorMessage = data.errors?.join(', ') || `HTTP ${response.status}`;
    throw new VaultError(
      `Failed to exchange code for token: ${errorMessage}`,
      'VAULT_AUTH_ERROR',
      response.status,
    );
  }

  const data = (await response.json()) as {
    auth?: { client_token?: string; lease_duration?: number };
  };
  const token = data.auth?.client_token;

  if (!token) {
    throw new VaultError(
      'Vault did not return a client token',
      'VAULT_AUTH_ERROR',
    );
  }

  return {
    token,
    ttlSeconds: data.auth?.lease_duration || 3600,
  };
}

/**
 * Send an HTML response to the browser.
 */
function sendHtmlResponse(
  res: ServerResponse,
  title: string,
  body: string,
): void {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; padding: 40px; text-align: center; }
    h1 { color: #333; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${body}
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}
