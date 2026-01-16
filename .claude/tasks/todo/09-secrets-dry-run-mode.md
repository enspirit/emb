# Task 09: Secrets Dry-Run Mode

## Problem

It's difficult to verify secret resolution without actually fetching secrets. Users need a way to:
- Check that all secret references in their config are valid
- Debug configuration issues before running tasks
- Verify provider connectivity
- See which secrets would be resolved without exposing actual values

## Proposed Solution

Add an `emb secrets` command with subcommands for validating and inspecting secrets.

## Command Design

### `emb secrets list`

List all secret references found in the configuration:

```
$ emb secrets list

  SOURCE   PATH                                                    KEY             COMPONENT
  vault    op/q8s.dev/vaults/q8s.stg-cv-cronos/items/cv-cronos     cookie-secret   buildargs
  vault    secret/myapp/database                                   password        api
  vault    secret/myapp/database                                   username        api

Found 3 secret references using 1 provider(s)
```

### `emb secrets validate`

Validate that all secrets can be resolved (without showing values):

```
$ emb secrets validate

  STATUS   SOURCE   PATH                                                    KEY
  ✔        vault    op/q8s.dev/vaults/q8s.stg-cv-cronos/items/cv-cronos     cookie-secret
  ✔        vault    secret/myapp/database                                   password
  ✖        vault    secret/myapp/missing                                    key

Validation: 2 passed, 1 failed

Error details:
  - vault:secret/myapp/missing#key: Failed to read secret at 'secret/myapp/missing': permission denied
```

Options:
- `--fail-fast` - Stop on first error
- `--component <name>` - Only validate secrets for a specific component
- `--json` - Output as JSON for scripting

### `emb secrets providers`

Show configured secret providers and their status:

```
$ emb secrets providers

  NAME    TYPE    ADDRESS                    STATUS
  vault   vault   https://vault.q8s.dev      ✔ Connected (token expires in 45m)

1 provider(s) configured
```

## Implementation Plan

### Phase 1: Secret Reference Discovery

Create a utility to scan configuration and find all `${provider:path#key}` references:

```typescript
interface SecretReference {
  provider: string;      // e.g., "vault"
  path: string;          // e.g., "secret/myapp/db"
  key?: string;          // e.g., "password"
  location: {
    file: string;        // e.g., "examples/api/Embfile.yml"
    component?: string;  // e.g., "api"
    field: string;       // e.g., "env.DB_PASSWORD"
  };
}

function discoverSecretReferences(config: EMBConfig): SecretReference[];
```

### Phase 2: CLI Commands

1. Create `src/cli/commands/secrets/index.ts` - base secrets command
2. Create `src/cli/commands/secrets/list.ts` - list references
3. Create `src/cli/commands/secrets/validate.ts` - validate resolution
4. Create `src/cli/commands/secrets/providers.ts` - show provider status

### Phase 3: Validation Logic

Create `src/secrets/SecretValidator.ts`:

```typescript
interface ValidationResult {
  reference: SecretReference;
  status: 'ok' | 'error';
  error?: string;
}

class SecretValidator {
  async validate(refs: SecretReference[]): Promise<ValidationResult[]>;
  async validateOne(ref: SecretReference): Promise<ValidationResult>;
}
```

## Files to Create

- [ ] `src/cli/commands/secrets/index.ts` - Base command
- [ ] `src/cli/commands/secrets/list.ts` - List subcommand
- [ ] `src/cli/commands/secrets/validate.ts` - Validate subcommand
- [ ] `src/cli/commands/secrets/providers.ts` - Providers subcommand
- [ ] `src/secrets/SecretDiscovery.ts` - Reference discovery utility
- [ ] `src/secrets/SecretValidator.ts` - Validation logic
- [ ] `tests/unit/secrets/SecretDiscovery.spec.ts`
- [ ] `tests/unit/secrets/SecretValidator.spec.ts`

## Open Questions

1. **Should validation actually fetch secrets?**
   - Option A: Yes, fetch to verify access (slower, but confirms actual access)
   - Option B: No, only check path exists (faster, but may miss permission issues)
   - Recommendation: Option A with caching, since we want to catch permission errors

2. **How to handle secrets in flavors?**
   - Flavors can patch in different secrets
   - Should `--flavor` flag be supported?
   - Recommendation: Yes, validate for a specific flavor

3. **Integration with CI/CD?**
   - `emb secrets validate` could be a pre-flight check in pipelines
   - Exit code 0 = all valid, 1 = errors found
   - JSON output for parsing in scripts

4. **Token caching interaction?**
   - If OIDC token is cached, use it
   - If not cached, should we prompt for auth or fail?
   - Recommendation: Fail with message "Run `emb secrets login` first"

## Success Criteria

- [ ] `emb secrets list` shows all secret references in config
- [ ] `emb secrets validate` verifies all secrets are accessible
- [ ] `emb secrets providers` shows provider connection status
- [ ] Clear error messages for common issues (permission denied, not found, etc.)
- [ ] JSON output option for CI/CD integration
- [ ] Unit tests for discovery and validation logic

## Future Enhancements

- `emb secrets login` - Explicit login command for providers requiring auth
- `emb secrets get <ref>` - Fetch and display a single secret value (for debugging)
- `emb secrets export` - Export secrets to env file (for local dev)
- Integration with pre-task hooks to auto-validate
