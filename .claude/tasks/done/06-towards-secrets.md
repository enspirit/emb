# EMB Secrets Loading Refactoring Plan

## Goal

Extend EMB to load secrets from external providers (HashiCorp Vault first, 1Password later) and inject them into docker buildArgs, environment variables, and template expansions.

## Status

### Completed

- [x] Phase 1: Core Infrastructure
  - [x] SecretProvider abstract class with caching
  - [x] SecretManager for provider registry
  - [x] TemplateExpander refactored for async sources
- [x] Phase 2: HashiCorp Vault Implementation
  - [x] VaultProvider with token, AppRole, Kubernetes auth
  - [x] VaultPlugin for configuration-based integration
- [x] Phase 3: Integration
  - [x] SecretManager added to EmbContext
  - [x] Monorepo.expand() updated with vault source
  - [x] Configuration schema updated
- [x] Phase 4: Testing
  - [x] Unit tests for all components
  - [x] Integration tests with automatic Vault container management

### Remaining

- [ ] GitHub Actions CI integration
- [ ] Documentation
- [ ] 1Password provider (future)

---

## Recommended Approach: Hybrid (Plugin + Async Template Source)

- **Plugin** handles connection setup and authentication during `init()`
- **New template source** `${vault:path/to/secret#key}` fetches secrets on-demand with caching
- **TemplateExpander** refactored to support async source providers

This approach offers the best balance: plugins manage connections, template sources provide flexible lazy-loading, and caching prevents repeated fetches.

---

## Implementation Summary

### Files Created

```
src/
  secrets/
    index.ts                    # Exports
    SecretProvider.ts           # Abstract interface with caching
    SecretManager.ts            # Provider registry
    providers/
      index.ts                  # Exports
      VaultProvider.ts          # HashiCorp Vault KV v2 implementation
  monorepo/plugins/
    VaultPlugin.ts              # Plugin for Vault configuration

tests/
  unit/secrets/
    SecretProvider.spec.ts      # Cache behavior tests
    SecretManager.spec.ts       # Registry tests
    providers/
      VaultProvider.spec.ts     # Auth flows, KV read (mocked)
  unit/monorepo/plugins/
    VaultPlugin.spec.ts         # Config resolution tests
  integration/secrets/
    vault.spec.ts               # Full integration tests
    global-setup.ts             # Automatic Vault container management
```

### Files Modified

- `src/types.ts` - Added `secrets: SecretManager` to EmbContext
- `src/cli/abstract/BaseCommand.ts` - Creates SecretManager in context
- `src/monorepo/monorepo.ts` - Updated expand() to include vault source
- `src/monorepo/plugins/index.ts` - Registered VaultPlugin
- `src/utils/TemplateExpander.ts` - Added async source support
- `src/config/schema.json` - Added VaultPluginConfig schema
- `tsconfig.json` - Added @/secrets path mapping
- `vitest.workspace.ts` - Added integration-secrets test workspace

---

## Integration Testing

Integration tests automatically manage a Vault dev server:

1. **globalSetup** (`tests/integration/secrets/global-setup.ts`):
   - Starts a Vault container before tests
   - Waits for Vault to be ready
   - Sets VAULT_ADDR and VAULT_TOKEN environment variables
   - Tears down container after tests

2. **Test execution**:
   - Tests run without skipIf conditions
   - Tests will fail if Vault is unavailable (container startup failure)
   - Sequential execution to avoid Docker conflicts

### Running Integration Tests

```bash
# Run all integration tests (includes Vault)
npm run test:integration

# Run only Vault integration tests
npx vitest run --project integration-secrets
```

---

## GitHub Actions CI

To run Vault integration tests in GitHub Actions, the workflow needs Docker access:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run build
      - run: npm run test:unit
      - run: npm run test:integration
        # Docker is available by default on ubuntu-latest
```

The global-setup.ts handles:
- Starting the Vault container
- Waiting for readiness
- Setting environment variables
- Cleanup after tests

---

## Usage Example

**.emb.yml:**
```yaml
plugins:
  - name: vault
    config:
      address: ${env:VAULT_ADDR:-http://localhost:8200}
      auth:
        method: token
        token: ${env:VAULT_TOKEN}

env:
  DB_PASSWORD: ${vault:secret/data/prod/db#password}

components:
  api:
    resources:
      image:
        type: docker/image
        params:
          buildArgs:
            NPM_TOKEN: ${vault:secret/data/ci/npm#token}
```

---

## Notes

- **Circular dependency**: Vault plugin config cannot use `${vault:...}` (it can use `${env:...}`)
- **Error handling**: VaultError distinguishes connection errors vs. auth errors vs. secret not found
- **Caching**: Secrets cached per-command run (cleared when process exits)
- **Authentication**: Supports token, AppRole, and Kubernetes auth methods
