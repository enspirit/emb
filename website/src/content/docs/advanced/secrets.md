---
title: Secrets Management
description: Securely inject secrets from external providers like HashiCorp Vault
---

EMB can fetch secrets from external providers and inject them into your configuration. This allows you to avoid storing sensitive data in configuration files or environment variables.

## Supported Providers

### HashiCorp Vault

EMB integrates with [HashiCorp Vault](https://www.vaultproject.io/) to fetch secrets at runtime. Vault provides:

- Centralized secret storage
- Access control and audit logging
- Secret rotation and versioning
- Multiple authentication methods

## Configuration

### Adding the Vault Plugin

Add the `vault` plugin to your `.emb.yml`:

```yaml
plugins:
  - name: vault
    config:
      address: https://vault.example.com
      auth:
        method: token
        token: ${env:VAULT_TOKEN}
```

### Authentication Methods

EMB supports multiple Vault authentication methods:

#### Token Authentication

The simplest method, using a pre-existing Vault token:

```yaml
plugins:
  - name: vault
    config:
      address: https://vault.example.com
      auth:
        method: token
        token: ${env:VAULT_TOKEN}
```

Or set the `VAULT_TOKEN` environment variable and omit the auth config:

```yaml
plugins:
  - name: vault
    config:
      address: ${env:VAULT_ADDR}
```

#### AppRole Authentication

For automated systems and CI/CD pipelines:

```yaml
plugins:
  - name: vault
    config:
      address: https://vault.example.com
      auth:
        method: approle
        roleId: ${env:VAULT_ROLE_ID}
        secretId: ${env:VAULT_SECRET_ID}
```

Or use environment variables: `VAULT_ROLE_ID` and `VAULT_SECRET_ID`.

#### JWT Authentication

For CI/CD pipelines with JWT tokens (e.g., from GitLab CI, GitHub Actions):

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

Or use environment variables: `VAULT_JWT` and `VAULT_JWT_ROLE`.

#### OIDC Authentication (Interactive)

For developer workstations, opens a browser for SSO login:

```yaml
plugins:
  - name: vault
    config:
      address: https://vault.example.com
      auth:
        method: oidc
        role: developer    # Optional, uses Vault's default role if omitted
        port: 8250         # Optional, callback server port
```

Or use the `VAULT_OIDC_ROLE` environment variable.

The OIDC flow:
1. EMB starts a local callback server
2. Opens your browser to Vault's OIDC login page
3. You authenticate with your identity provider (Keycloak, Okta, etc.)
4. EMB receives the token and continues

**Token Caching:** OIDC tokens are cached locally (encrypted) in `~/.emb/vault-tokens/` to avoid repeated browser authentication. The cache is machine-specific and automatically expires before the token TTL.

#### Kubernetes Authentication

For workloads running in Kubernetes:

```yaml
plugins:
  - name: vault
    config:
      address: https://vault.example.com
      auth:
        method: kubernetes
        role: my-app
```

Or use the `VAULT_K8S_ROLE` environment variable.

### Namespace Support

For Vault Enterprise with namespaces:

```yaml
plugins:
  - name: vault
    config:
      address: https://vault.example.com
      namespace: my-team
      auth:
        method: token
        token: ${env:VAULT_TOKEN}
```

## Using Secrets

### Secret Reference Syntax

Reference secrets in your configuration using the `${vault:path#key}` syntax:

```yaml
env:
  DATABASE_URL: ${vault:secret/myapp/database#url}
  API_KEY: ${vault:secret/myapp/api#key}
```

The syntax is:
- `vault:` - The secret source prefix
- `path` - Path to the secret in Vault (e.g., `secret/myapp/database`)
- `#key` - The key within the secret to retrieve

### KV Version 2 Secrets Engine

EMB automatically handles Vault's KV v2 path format. You can use either:

```yaml
# Simplified path (EMB adds /data/ automatically)
DATABASE_URL: ${vault:secret/myapp/database#url}

# Explicit path
DATABASE_URL: ${vault:secret/data/myapp/database#url}
```

### Secret Versioning

To fetch a specific version of a secret, add the version to the path:

```yaml
# This requires explicit API calls (not yet supported in template syntax)
# Use the current/latest version for now
DATABASE_URL: ${vault:secret/myapp/database#url}
```

## CLI Commands

EMB provides commands to inspect and validate secret references in your configuration.

### List Secret References

Show all secret references discovered in your configuration:

```bash
emb secrets
```

Example output:
```
  PROVIDER   PATH                    KEY        COMPONENT   USAGECOUNT
  vault      secret/myapp/database   url        api         2
  vault      secret/myapp/api        key        -           1
```

Use `--json` for machine-readable output.

### Validate Secrets

Verify that all secret references can be resolved (without revealing values):

```bash
emb secrets validate
```

Example output:
```
  STATUS   PROVIDER   PATH                    KEY
  ✔        vault      secret/myapp/database   url
  ✔        vault      secret/myapp/api        key
  ✖        vault      secret/missing          password

Validation: 2 passed, 1 failed

Error details:
  - vault:secret/missing#password: Secret not found
```

Options:
- `--fail-fast` - Stop on first validation error
- `--json` - Output results as JSON

### Show Providers

List configured secret providers and their connection status:

```bash
emb secrets providers
```

Example output:
```
  NAME    TYPE    STATUS
  vault   vault   connected
```

## Environment Variables Reference

EMB automatically detects these environment variables for Vault configuration:

| Variable | Description |
|----------|-------------|
| `VAULT_ADDR` | Vault server address |
| `VAULT_TOKEN` | Vault token for token auth |
| `VAULT_NAMESPACE` | Vault namespace (Enterprise) |
| `VAULT_ROLE_ID` | AppRole role ID |
| `VAULT_SECRET_ID` | AppRole secret ID |
| `VAULT_JWT` | JWT token for JWT auth |
| `VAULT_JWT_ROLE` | Role name for JWT auth |
| `VAULT_OIDC_ROLE` | Role name for OIDC auth |
| `VAULT_K8S_ROLE` | Role name for Kubernetes auth |

## Examples

### Development Setup with OIDC

For local development with SSO:

```yaml
# .emb.yml
plugins:
  - name: vault
    config:
      address: https://vault.company.com
      auth:
        method: oidc
        role: developer

env:
  DATABASE_URL: ${vault:secret/dev/database#connection_string}
  REDIS_URL: ${vault:secret/dev/redis#url}
```

### CI/CD Pipeline with JWT

For GitLab CI or GitHub Actions:

```yaml
# .emb.yml
plugins:
  - name: vault
    config:
      address: https://vault.company.com
      auth:
        method: jwt
        role: ci-runner
        jwt: ${env:CI_JOB_JWT}  # GitLab CI provides this

env:
  DEPLOY_KEY: ${vault:secret/ci/deploy#ssh_key}
  REGISTRY_PASSWORD: ${vault:secret/ci/registry#password}
```

### Production with AppRole

For production deployments:

```yaml
# .emb.yml
plugins:
  - name: vault
    config:
      address: https://vault.company.com
      namespace: production
      auth:
        method: approle
        roleId: ${env:VAULT_ROLE_ID}
        secretId: ${env:VAULT_SECRET_ID}

env:
  DATABASE_URL: ${vault:secret/prod/database#url}
  API_SECRET: ${vault:secret/prod/api#secret}
```

## Vault Server Setup

EMB expects Vault to be configured with the KV v2 secrets engine. Here's a minimal setup:

```bash
# Enable KV v2 at 'secret/' path (usually enabled by default)
vault secrets enable -path=secret kv-v2

# Store a secret
vault kv put secret/myapp/database \
  url="postgresql://user:pass@db:5432/myapp" \
  username="user" \
  password="pass"

# Read it back
vault kv get secret/myapp/database
```

### OIDC Configuration

To use OIDC authentication, configure Vault's OIDC auth backend:

```bash
# Enable OIDC auth
vault auth enable oidc

# Configure with your identity provider (e.g., Keycloak)
vault write auth/oidc/config \
  oidc_discovery_url="https://keycloak.example.com/realms/myrealm" \
  oidc_client_id="vault" \
  oidc_client_secret="your-client-secret" \
  default_role="developer"

# Create a role
vault write auth/oidc/role/developer \
  bound_audiences="vault" \
  allowed_redirect_uris="http://localhost:8250/oidc/callback" \
  user_claim="sub" \
  policies="developer"
```

### JWT Configuration

For CI/CD JWT authentication:

```bash
# Enable JWT auth
vault auth enable jwt

# Configure with your CI provider's JWKS
vault write auth/jwt/config \
  jwks_url="https://gitlab.example.com/-/jwks" \
  bound_issuer="https://gitlab.example.com"

# Create a role for CI jobs
vault write auth/jwt/role/ci-runner \
  bound_audiences="vault" \
  user_claim="sub" \
  policies="ci-deploy" \
  ttl="1h"
```

## Troubleshooting

### "Vault authentication not configured"

EMB couldn't determine how to authenticate. Either:
- Add explicit `auth` config in the vault plugin
- Set the appropriate environment variables (`VAULT_TOKEN`, etc.)

### "Failed to get OIDC auth URL"

The OIDC auth backend may not be enabled or configured in Vault. Check:
- OIDC auth is enabled: `vault auth list`
- Discovery URL is accessible from Vault
- Client ID and secret are correct

### "Permission denied"

Your token doesn't have access to the requested secret path. Check:
- Token policies allow reading the path
- Namespace is correct (if using Vault Enterprise)

### Secrets Not Resolving

If `${vault:...}` syntax isn't being replaced:
- Verify the vault plugin is loaded (check for errors on startup)
- Ensure the secret path and key are correct
- Check Vault connectivity: `vault status`
