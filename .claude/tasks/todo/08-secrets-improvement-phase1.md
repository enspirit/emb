# Task 08: Secrets Improvement Phase 1 - Token Caching

## Problem

Currently, each EMB invocation requires a new authentication flow. For OIDC, this means opening the browser every time the user runs `emb up` or any command that needs secrets.

## Solution

Cache Vault tokens to disk with TTL tracking:
- Store tokens in `~/.emb/vault-tokens/` (one file per Vault address)
- Include token metadata: expiry time, creation time, namespace
- Reuse valid tokens on subsequent invocations
- Automatic re-authentication when token expires or is close to expiry

## Implementation Plan

### 1. Create Token Cache Module

Create `src/secrets/providers/VaultTokenCache.ts`:
- `getCachedToken(vaultAddress, namespace?)` - retrieve cached token if valid
- `cacheToken(vaultAddress, token, ttl, namespace?)` - store token with metadata
- `clearToken(vaultAddress, namespace?)` - remove cached token
- Token file format: JSON with `token`, `expiresAt`, `createdAt`, `namespace`

### 2. Integrate with VaultProvider

Modify `VaultProvider.connect()`:
- Check cache before initiating auth flow
- Verify cached token is still valid (call Vault's token lookup)
- If invalid or missing, proceed with normal auth
- After successful auth, cache the new token

### 3. Handle Token TTL

- Parse TTL from Vault's auth response (`auth.lease_duration`)
- Add buffer (e.g., refresh if < 5 minutes remaining)
- Store expiry timestamp in cache file

### 4. Security Considerations

- File permissions: 0600 (user read/write only)
- Don't log token values
- Consider encrypting cache file (optional, lower priority)

## Files Modified/Created

- [x] `src/secrets/providers/VaultTokenCache.ts` (new) - Token cache module
- [x] `src/secrets/providers/VaultProvider.ts` - Integrated cache, updated auth methods to return TTL
- [x] `src/secrets/providers/VaultOidcHelper.ts` - Updated to return TTL with token
- [x] `src/secrets/providers/index.ts` - Export VaultTokenCache
- [x] `tests/unit/secrets/providers/VaultTokenCache.spec.ts` (new) - 17 unit tests
- [x] `tests/unit/secrets/providers/VaultProvider.spec.ts` - Updated OIDC test

## Success Criteria

- [x] Running `emb up` twice in a row only opens browser once
- [x] Token is reused until close to expiry (5 minute buffer)
- [x] Graceful fallback to full auth if cache is corrupted/missing
- [x] Unit tests for cache logic (17 tests passing)

## Implementation Notes

- Tokens are cached in `~/.emb/vault-tokens/` with restricted permissions (0600)
- Cache key is a SHA256 hash of `vaultAddress::namespace`
- Token files are JSON with: token, expiresAt, createdAt, namespace, vaultAddress
- Default expiry buffer is 5 minutes (configurable)
- Only OIDC auth method benefits from caching (other methods like token, approle don't need it)
