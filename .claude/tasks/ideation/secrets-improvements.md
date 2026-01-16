# Ideation: Secrets System Improvements

Ideas for improving the secrets management system based on the OIDC/Keycloak implementation work.

## 1. Token Caching and Refresh

**Problem:** Currently, each EMB invocation requires a new authentication flow. For OIDC, this means opening the browser every time.

**Solution:**
- Cache Vault tokens to disk (encrypted) with TTL tracking
- Implement token refresh before expiry
- Location: `~/.emb/vault-token` or `~/.emb/secrets-cache/`

**Complexity:** Medium

## 2. Additional Secret Providers

**AWS Secrets Manager:**
- Support for AWS Secrets Manager as a secret source
- Auth via AWS credentials (env vars, IAM roles, profiles)
- Syntax: `${aws:secret-name#key}`

**Azure Key Vault:**
- Support for Azure Key Vault
- Auth via Azure CLI, managed identity, or service principal
- Syntax: `${azure:vault-name/secret-name}`

**1Password CLI:**
- Integration with 1Password CLI (`op`)
- Syntax: `${1password:vault/item#field}`

**Complexity:** Medium per provider

## 3. Secret Rotation Awareness

**Problem:** Long-running processes may hold stale secrets after rotation.

**Solution:**
- Add `refresh()` method to SecretProvider interface
- Support TTL hints from providers
- Optional periodic refresh in background

**Complexity:** Medium-High

## 4. Vault Namespace Support in Plugin Config

**Current:** Namespace can be set but not well documented.

**Improvement:**
- Add `VAULT_NAMESPACE` env var detection
- Document multi-tenant Vault setups
- Add namespace to integration tests

**Complexity:** Low

## 5. Secret Masking in Logs

**Problem:** Secrets might accidentally appear in logs or error messages.

**Solution:**
- Track resolved secret values
- Implement log filter that replaces secrets with `***`
- Apply to stdout/stderr from tasks

**Complexity:** Medium

## 6. Dry-Run Mode for Secrets

**Problem:** Hard to verify secret resolution without actually fetching them.

**Solution:**
- Add `--dry-run` flag that shows which secrets would be resolved
- Show source, path, and key without actual values
- Useful for debugging configuration

**Complexity:** Low

## 7. Secret Dependencies Between Components

**Problem:** One component might need a secret that another component generates/manages.

**Solution:**
- Allow components to "export" secrets
- Reference exported secrets from other components
- Build dependency graph for secret resolution order

**Complexity:** High

## 8. Integration Test Improvements

**Current:** Tests start fresh containers each run.

**Improvements:**
- Add option to reuse running containers (faster iteration)
- Add health check retries with backoff
- Consider using testcontainers library for better lifecycle management
- Add CI matrix testing (Linux + macOS)

**Complexity:** Medium

## 9. OIDC Device Flow Support

**Problem:** OIDC browser flow doesn't work in headless/SSH environments.

**Solution:**
- Implement OAuth 2.0 Device Authorization Grant (RFC 8628)
- Display code for user to enter on another device
- Poll for completion

**Complexity:** Medium

## 10. Secret Validation

**Problem:** Invalid secret references fail at runtime.

**Solution:**
- Add `emb secrets validate` command
- Check all secret references in config are resolvable
- Verify provider connectivity
- Run as pre-flight check before tasks

**Complexity:** Low-Medium

## Priority Recommendation

1. **High Value, Low Effort:**
   - Secret Masking in Logs (#5)
   - Dry-Run Mode (#6)
   - Vault Namespace Documentation (#4)

2. **High Value, Medium Effort:**
   - Token Caching (#1)
   - Secret Validation Command (#10)

3. **Future Consideration:**
   - Additional Providers (#2)
   - Device Flow (#9)
   - Secret Dependencies (#7)
