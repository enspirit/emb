# EMB Secrets Loading Refactoring Plan

## Goal

Extend EMB to load secrets from external providers (HashiCorp Vault first, 1Password later) and inject them into docker buildArgs, environment variables, and template expansions.

## Recommended Approach: Hybrid (Plugin + Async Template Source)

- **Plugin** handles connection setup and authentication during `init()`
- **New template source** `${vault:path/to/secret#key}` fetches secrets on-demand with caching
- **TemplateExpander** refactored to support async source providers

This approach offers the best balance: plugins manage connections, template sources provide flexible lazy-loading, and caching prevents repeated fetches.

---

## Phase 1: Core Infrastructure

### 1.1 Create Secret Provider Interface

**New file: `src/secrets/SecretProvider.ts`**

```typescript
export interface SecretReference {
  path: string;       // e.g., "secret/data/myapp/db"
  key?: string;       // Optional field within the secret
  version?: string;   // Optional version
}

export abstract class AbstractSecretProvider<C = unknown> {
  protected cache = new Map<string, Record<string, unknown>>();

  constructor(protected config: C) {}

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract fetchSecret(ref: SecretReference): Promise<Record<string, unknown>>;

  async get(ref: SecretReference): Promise<unknown> {
    const cacheKey = `${ref.path}:${ref.version || 'latest'}`;
    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, await this.fetchSecret(ref));
    }
    const cached = this.cache.get(cacheKey)!;
    return ref.key ? cached[ref.key] : cached;
  }
}
```

### 1.2 Create Secret Manager

**New file: `src/secrets/SecretManager.ts`**

```typescript
export class SecretManager {
  private providers = new Map<string, AbstractSecretProvider>();

  register(name: string, provider: AbstractSecretProvider): void;
  get(name: string): AbstractSecretProvider | undefined;
  async connectAll(): Promise<void>;

  // Create an async source function for TemplateExpander
  createSource(providerName: string): AsyncSource {
    return async (key: string) => {
      const provider = this.get(providerName);
      const ref = this.parseReference(key); // "path#field" -> SecretReference
      return provider.get(ref);
    };
  }
}
```

### 1.3 Refactor TemplateExpander for Async Sources

**Modify: `src/utils/TemplateExpander.ts`**

Current problem: `replaceAll()` callback is synchronous but method is marked async.

Required changes:
1. Add async source type: `type AsyncSource = (key: string) => Promise<unknown>`
2. Refactor `expand()` to collect all matches first, resolve async sources, then build result string
3. Keep backward compatibility with sync sources (Record objects)

```typescript
type StaticSource = Record<string, unknown>;
type AsyncSource = (key: string) => Promise<unknown>;
type Source = StaticSource | AsyncSource;

type ExpandOptions = {
  default?: string;
  sources?: Record<string, Source>;
};

async expand(str: string, options: ExpandOptions = {}): Promise<string> {
  // 1. Collect all matches with their positions
  const matches = [...str.matchAll(TPL_REGEX)];

  // 2. Resolve all values (async for function sources, sync for objects)
  const resolutions = await Promise.all(matches.map(async (match) => {
    const source = options.sources?.[sourceName];
    if (typeof source === 'function') {
      return source(key);  // Async source
    }
    return source?.[key];  // Static source
  }));

  // 3. Build result string with resolved values
  // ...
}
```

---

## Phase 2: HashiCorp Vault Implementation

### 2.1 Vault Provider

**New file: `src/secrets/providers/VaultProvider.ts`**

```typescript
export interface VaultProviderConfig {
  address: string;        // VAULT_ADDR
  namespace?: string;     // VAULT_NAMESPACE
  auth: VaultAuthConfig;
}

type VaultAuthConfig =
  | { method: 'token'; token: string }
  | { method: 'approle'; roleId: string; secretId: string }
  | { method: 'kubernetes'; role: string };

export class VaultProvider extends AbstractSecretProvider<VaultProviderConfig> {
  async connect(): Promise<void> { /* authenticate */ }
  async fetchSecret(ref: SecretReference): Promise<Record<string, unknown>> {
    // GET /v1/{mount}/data/{path} for KV v2
  }
}
```

Dependencies: Consider `node-vault` or direct HTTP calls.

### 2.2 Vault Plugin

**New file: `src/monorepo/plugins/VaultPlugin.ts`**

```typescript
export class VaultPlugin extends AbstractPlugin<VaultPluginConfig> {
  static name = 'vault';

  async init(): Promise<void> {
    // 1. Resolve config (merge with env vars like VAULT_ADDR, VAULT_TOKEN)
    // 2. Create and connect VaultProvider
    // 3. Register with global SecretManager
  }
}
```

**Modify: `src/monorepo/plugins/index.ts`**

Register VaultPlugin.

---

## Phase 3: Integration

### 3.1 Add SecretManager to Context

**Modify: `src/types.ts`** - Add `secrets: SecretManager` to EmbContext

### 3.2 Update Monorepo.expand()

**Modify: `src/monorepo/monorepo.ts`**

```typescript
async expand<T extends Expandable>(toExpand: T, vars?: Record<string, unknown>) {
  const secrets = getContext()?.secrets;
  const options = {
    default: 'vars',
    sources: {
      env: process.env,
      vars: vars || this.vars,
      // Add secret sources dynamically
      vault: secrets?.createSource('vault'),
      // Future: op: secrets?.createSource('op'),
    },
  };
  return expander.expandRecord(toExpand, options);
}
```

### 3.3 Update Configuration Schema

**Modify: `src/config/schema.json`**

Add VaultPluginConfig definition for validation.

---

## Phase 4: Testing Strategy

### Unit Tests

| File | Tests |
|------|-------|
| `tests/unit/secrets/SecretProvider.spec.ts` | Cache behavior, reference parsing |
| `tests/unit/secrets/SecretManager.spec.ts` | Provider registration, source creation |
| `tests/unit/secrets/providers/VaultProvider.spec.ts` | Auth flows (mocked), KV read, error handling |
| `tests/unit/monorepo/plugins/VaultPlugin.spec.ts` | Config resolution, provider registration |
| `tests/unit/utils/TemplateExpander/expand.spec.ts` | **Add** async source tests, mixed sync/async |

### Integration Tests

**New file: `tests/integration/secrets/vault.spec.ts`**

Use Vault dev server in Docker:
```bash
docker run -d --name vault-test -p 8200:8200 hashicorp/vault server -dev
```

Test scenarios:
- Full authentication flow
- Secret reading through `${vault:path#key}` expansion
- Task execution with vault secrets
- Docker buildArgs with vault secrets

---

## File Structure

```
src/
  secrets/
    index.ts
    SecretProvider.ts           # Abstract interface
    SecretManager.ts            # Provider registry
    providers/
      index.ts
      VaultProvider.ts          # HashiCorp Vault
  monorepo/plugins/
    VaultPlugin.ts              # NEW
    index.ts                    # MODIFY: register VaultPlugin
  utils/
    TemplateExpander.ts         # MODIFY: async sources
  types.ts                      # MODIFY: add secrets to context

tests/
  unit/secrets/                 # NEW: all unit tests
  integration/secrets/          # NEW: vault integration tests
```

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

## Implementation Order

1. **Core infrastructure** - SecretProvider, SecretManager, TemplateExpander refactor
2. **VaultProvider** - Vault-specific implementation
3. **VaultPlugin** - Plugin integration
4. **Context integration** - Wire up SecretManager
5. **Testing** - Unit + integration tests
6. **(Future)** 1Password support using same pattern

---

## Verification

1. **Unit tests pass**: `npm run test:unit`
2. **Integration tests pass**: `npm run test:integration` (requires Docker for Vault)
3. **Manual test**:
   - Start Vault dev server: `docker run -d -p 8200:8200 hashicorp/vault server -dev`
   - Create test secret: `vault kv put secret/test password=mysecret`
   - Configure `.emb.yml` with vault plugin and `${vault:secret/data/test#password}`
   - Run a task that uses the secret and verify it resolves correctly

---

## Notes

- **Circular dependency**: Vault plugin config cannot use `${vault:...}` (it can use `${env:...}`)
- **Error handling**: Distinguish connection errors vs. auth errors vs. secret not found
- **Caching**: Secrets cached per-command run (cleared when process exits)