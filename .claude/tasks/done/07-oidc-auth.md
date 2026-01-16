# Completed: Add Keycloak/OIDC Authentication for Vault

## Summary

Added OIDC (Keycloak) authentication to the Vault integration with two modes:
1. **Interactive (OIDC)**: Browser-based login for developer workstations
2. **Non-interactive (JWT)**: Token-based auth for CI/CD pipelines

## What Was Implemented

### 1. Dependencies Added

- `open` (^10.1.0) - Cross-platform browser launcher for OIDC flow

Note: `openid-client` was not needed as Vault handles the OIDC flow internally.

### 2. Extended VaultAuthConfig Types

**File:** `src/secrets/providers/VaultProvider.ts`

```typescript
export type VaultAuthConfig =
  | { method: 'approle'; roleId: string; secretId: string }
  | { method: 'jwt'; role: string; jwt: string }
  | { method: 'kubernetes'; role: string }
  | { method: 'oidc'; role?: string; port?: number }
  | { method: 'token'; token: string };
```

### 3. JWT Auth Method

Non-interactive authentication for CI/CD pipelines:
- Sends JWT to Vault's `/v1/auth/jwt/login` endpoint
- Vault validates JWT and returns a client token

### 4. OIDC Auth Method (Browser Flow)

Interactive authentication using Authorization Code + PKCE:

**New file:** `src/secrets/providers/VaultOidcHelper.ts`
- Starts local HTTP callback server on configurable port (default: 8250)
- Generates random state and nonce for CSRF protection
- Requests auth URL from Vault via POST to `/v1/auth/oidc/oidc/auth_url`
- Opens browser for user authentication
- Exchanges authorization code for Vault token
- Returns HTML response to browser on success/failure

### 5. VaultPlugin Environment Variable Support

**File:** `src/monorepo/plugins/VaultPlugin.ts`

Added automatic auth detection:
- `VAULT_JWT` + `VAULT_JWT_ROLE` → JWT auth
- `VAULT_OIDC_ROLE` → OIDC auth (interactive)

### 6. Integration Tests with Real Keycloak

**Files:**
- `tests/integration/secrets/global-setup.ts` - Starts Vault + Keycloak containers
- `tests/integration/secrets/vault.spec.ts` - Tests for all auth methods

Integration test infrastructure:
- Docker network for container-to-container communication (works on Linux + macOS)
- Keycloak configured with test realm (`emb-test`), client (`vault`), and test user
- JWT auth tests using RSA key pair for signing
- OIDC tests with mocked browser (prevents actual browser opening)

## Files Created/Modified

| File | Action |
|------|--------|
| `package.json` | Added `open` dependency |
| `src/secrets/providers/VaultProvider.ts` | Added OIDC and JWT auth methods |
| `src/secrets/providers/VaultOidcHelper.ts` | New file for browser login flow |
| `src/monorepo/plugins/VaultPlugin.ts` | Added env var resolution for new methods |
| `tests/unit/secrets/providers/VaultProvider.spec.ts` | Added tests for new auth methods |
| `tests/unit/secrets/providers/VaultOidcHelper.spec.ts` | New unit test file |
| `tests/unit/monorepo/plugins/VaultPlugin.spec.ts` | Added tests for JWT/OIDC env vars |
| `tests/integration/secrets/global-setup.ts` | Added Keycloak container + Docker network |
| `tests/integration/secrets/vault.spec.ts` | Added JWT and OIDC integration tests |

## Test Results

- **Unit tests**: 369 passed
- **Integration tests (secrets)**: 9 passed
  - Token auth: connect, fetch secrets
  - Template expansion with vault source
  - JWT auth: invalid token, expired token
  - OIDC auth: unconfigured vault, auth URL request, timeout behavior

## Configuration Examples

**.emb.yml for developers (interactive):**
```yaml
plugins:
  - name: vault
    config:
      address: https://vault.example.com
      auth:
        method: oidc
        role: developer  # Optional, uses default role if omitted
```

**.emb.yml for CI/CD (JWT):**
```yaml
plugins:
  - name: vault
    config:
      address: https://vault.example.com
      auth:
        method: jwt
        role: ci-runner
        jwt: ${env:VAULT_JWT}
```

## Notes

- Vault's OIDC auth URL endpoint requires POST (not GET) in recent versions
- Docker network approach works cross-platform (Linux + macOS)
- Browser opening is mocked in tests to prevent interactive prompts
- OIDC flow requires Vault to be pre-configured with OIDC auth backend
