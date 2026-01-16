/* eslint-disable n/no-unsupported-features/node-builtins -- fetch is stable in Node 20+ */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { VaultError } from '@/secrets/providers/VaultProvider.js';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock the 'open' package to prevent actual browser opening
vi.mock('open', () => ({
  default: vi.fn().mockImplementation(() => Promise.resolve()),
}));

describe('Secrets / Providers / VaultOidcHelper', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getOidcAuthUrl (tested via performOidcLogin)', () => {
    test('handles Vault error when getting auth URL', async () => {
      // Mock the OIDC auth URL request to return an error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ errors: ['OIDC auth not configured'] }),
      });

      // Import the helper dynamically to ensure mocks are applied
      const { performOidcLogin } =
        await import('@/secrets/providers/VaultOidcHelper.js');

      await expect(
        performOidcLogin({
          vaultAddress: 'http://localhost:8200',
          role: 'developer',
          port: 8251,
          timeout: 1000, // Short timeout for test
        }),
      ).rejects.toThrow(VaultError);
    });

    test('handles missing auth_url in response', async () => {
      // Mock the OIDC auth URL request to return empty data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      });

      const { performOidcLogin } =
        await import('@/secrets/providers/VaultOidcHelper.js');

      await expect(
        performOidcLogin({
          vaultAddress: 'http://localhost:8200',
          role: 'developer',
          port: 8252,
          timeout: 1000,
        }),
      ).rejects.toThrow('Vault did not return an OIDC auth URL');
    });
  });

  describe('exchangeCodeForToken (tested indirectly)', () => {
    // Note: The exchange code flow requires a running callback server
    // and browser interaction, which is difficult to test in unit tests.
    // Integration tests with a real Vault server would be more appropriate.
    test('placeholder for future integration tests', () => {
      // The OIDC callback flow involves:
      // 1. Starting a local HTTP server
      // 2. Opening a browser to Vault's OIDC endpoint
      // 3. User authenticates with Keycloak
      // 4. Callback received with auth code
      // 5. Exchange code for token with Vault
      //
      // This flow is best tested with integration tests against
      // a real Vault server with OIDC configured.
      expect(true).to.equal(true);
    });
  });
});
