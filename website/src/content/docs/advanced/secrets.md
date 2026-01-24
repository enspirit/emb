---
title: Secrets Management
description: Securely inject secrets from external providers like HashiCorp Vault and 1Password
---

EMB can fetch secrets from external providers and inject them into your configuration. This allows you to avoid storing sensitive data in configuration files or environment variables.

## Supported Providers

- [HashiCorp Vault](#hashicorp-vault) - Enterprise-grade secrets management
- [1Password CLI](#1password-cli) - Developer-friendly password manager

---

## HashiCorp Vault

EMB integrates with [HashiCorp Vault](https://www.vaultproject.io/) to fetch secrets at runtime. Vault provides:

- Centralized secret storage
- Access control and audit logging
- Secret rotation and versioning
- Multiple authentication methods

### Configuration

#### Adding the Vault Plugin

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

### Using Vault Secrets

#### Secret Reference Syntax

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

#### KV Version 2 Secrets Engine

EMB automatically handles Vault's KV v2 path format. You can use either:

```yaml
# Simplified path (EMB adds /data/ automatically)
DATABASE_URL: ${vault:secret/myapp/database#url}

# Explicit path
DATABASE_URL: ${vault:secret/data/myapp/database#url}
```

#### Secret Versioning

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
  PROVIDER   PATH                       KEY        COMPONENT   USAGECOUNT
  vault      secret/myapp/database      url        api         2
  op         Production/db-credentials  password   api         1
```

Use `--json` for machine-readable output.

### Validate Secrets

Verify that all secret references can be resolved (without revealing values):

```bash
emb secrets validate
```

Example output:
```
  STATUS   PROVIDER   PATH                       KEY
  ✔        vault      secret/myapp/database      url
  ✔        op         Production/db-credentials  password
  ✖        op         Production/missing-item    secret

Validation: 2 passed, 1 failed

Error details:
  - op:Production/missing-item#secret: Item 'missing-item' not found in vault 'Production'
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
  op      op      connected
```

### Vault Environment Variables

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

### Vault Examples

#### Development Setup with OIDC

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

#### CI/CD Pipeline with JWT

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

#### Production with AppRole

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

### Vault Server Setup

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

#### OIDC Configuration

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

#### JWT Configuration

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

### Vault Troubleshooting

#### "Vault authentication not configured"

EMB couldn't determine how to authenticate. Either:
- Add explicit `auth` config in the vault plugin
- Set the appropriate environment variables (`VAULT_TOKEN`, etc.)

#### "Failed to get OIDC auth URL"

The OIDC auth backend may not be enabled or configured in Vault. Check:
- OIDC auth is enabled: `vault auth list`
- Discovery URL is accessible from Vault
- Client ID and secret are correct

#### "Permission denied"

Your token doesn't have access to the requested secret path. Check:
- Token policies allow reading the path
- Namespace is correct (if using Vault Enterprise)

#### Secrets Not Resolving

If `${vault:...}` syntax isn't being replaced:
- Verify the vault plugin is loaded (check for errors on startup)
- Ensure the secret path and key are correct
- Check Vault connectivity: `vault status`

---

## 1Password CLI

EMB integrates with [1Password CLI](https://developer.1password.com/docs/cli/) (`op`) to fetch secrets from your 1Password vaults. This is ideal for:

- Developer workstations with 1Password already installed
- CI/CD pipelines using 1Password service accounts
- Teams already using 1Password for credential management

### Prerequisites

Install the 1Password CLI from https://1password.com/downloads/command-line/

### Configuration

#### Adding the 1Password Plugin

Add the `op` plugin to your `.emb.yml`:

```yaml
plugins:
  - name: op
```

That's it! If you're already signed in to `op` or have a service account token configured, EMB will use it automatically.

#### Optional: Specify Account

If you have multiple 1Password accounts, specify which one to use:

```yaml
plugins:
  - name: op
    config:
      account: my-team  # Account shorthand or UUID
```

Or use the `OP_ACCOUNT` environment variable.

### Authentication Methods

#### Interactive (Developer Workstations)

Sign in to 1Password CLI before using EMB:

```bash
# Sign in (opens browser or prompts for credentials)
op signin

# Then run EMB commands
emb up
```

#### Service Account (CI/CD)

For automated environments, use a [1Password Service Account](https://developer.1password.com/docs/service-accounts/):

```bash
# Set the service account token
export OP_SERVICE_ACCOUNT_TOKEN="ops_..."

# EMB will automatically use it
emb up
```

The `op` CLI automatically detects and uses the service account token.

### Using Secrets

#### Secret Reference Syntax

Reference secrets using the `${op:vault/item#field}` syntax:

```yaml
env:
  DATABASE_PASSWORD: ${op:Production/database-credentials#password}
  API_KEY: ${op:Development/api-keys#secret-key}
```

The syntax is:
- `op:` - The secret source prefix
- `vault` - Name of the 1Password vault
- `item` - Name of the item within the vault
- `#field` - The field label to retrieve

#### Finding Vault and Item Names

Use the 1Password CLI to list your vaults and items:

```bash
# List vaults
op vault list

# List items in a vault
op item list --vault Production

# Get item details (shows all fields)
op item get database-credentials --vault Production
```

### Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `OP_SERVICE_ACCOUNT_TOKEN` | Service account token for CI/CD |
| `OP_ACCOUNT` | Account shorthand or UUID (optional) |

### Examples

#### Development Setup

For local development with 1Password Desktop app:

```yaml
# .emb.yml
plugins:
  - name: op

env:
  DATABASE_URL: ${op:Development/postgres#connection-string}
  REDIS_URL: ${op:Development/redis#url}
  JWT_SECRET: ${op:Development/app-secrets#jwt-key}
```

#### CI/CD with Service Account

For GitHub Actions or GitLab CI:

```yaml
# .emb.yml
plugins:
  - name: op

env:
  DEPLOY_KEY: ${op:CI-CD/deploy-keys#ssh-private-key}
  REGISTRY_PASSWORD: ${op:CI-CD/docker-registry#password}
  AWS_SECRET_KEY: ${op:CI-CD/aws-credentials#secret-access-key}
```

In your CI pipeline, set the `OP_SERVICE_ACCOUNT_TOKEN` secret.

#### Multiple Environments with Flavors

Combine 1Password secrets with EMB flavors:

```yaml
# .emb.yml
plugins:
  - name: op

env:
  DATABASE_URL: ${op:Development/database#url}

flavors:
  staging:
    - op: replace
      path: /env/DATABASE_URL
      value: ${op:Staging/database#url}

  production:
    - op: replace
      path: /env/DATABASE_URL
      value: ${op:Production/database#url}
```

### Troubleshooting

#### "1Password CLI (op) not found"

The `op` CLI is not installed or not in your PATH. Install it from:
https://1password.com/downloads/command-line/

#### "Not signed in to 1Password"

You need to authenticate first:
- **Interactive:** Run `op signin`
- **CI/CD:** Set `OP_SERVICE_ACCOUNT_TOKEN` environment variable

#### "Vault 'X' not found"

The vault name doesn't match any vault in your account. Check:
- Vault name spelling (case-sensitive)
- You have access to the vault
- Correct account is selected (if multiple accounts)

#### "Item 'X' not found in vault 'Y'"

The item doesn't exist in the specified vault. Check:
- Item name spelling (case-sensitive)
- Item exists in the correct vault: `op item list --vault Y`

#### "Key 'X' not found in secret"

The field doesn't exist in the item. Check available fields:
```bash
op item get <item> --vault <vault>
```
