# Resource Publishing Abstraction - Ideation

## Current State Analysis

### The Good News

The foundation for publishable resources **already exists** in the codebase. The `IResourceBuilder` interface at `src/monorepo/resources/types.ts:28` already defines:

```typescript
publish?(resource: ResourceInfo<Input>, out?: Writable): Promise<void>;
```

This optional method is part of the resource builder contract but is **not currently used** by any resource type.

### The Problem

Despite this interface existing, image publishing is handled through a separate, Docker-specific path:

1. `emb images push` command (`src/cli/commands/images/push.ts`)
2. `PushImagesOperation` (`src/docker/operations/images/PushImagesOperation.ts`)
3. Hardcoded filter: `monorepo.resources.filter((r) => r.type === 'docker/image')`

This breaks the resource abstraction. Resources are "buildable" generically via `emb resources build`, but "publishable" only through type-specific commands.

## Proposed Design

### 1. Implement `publish()` in Resource Builders

Move the push logic from `PushImagesOperation` into `DockerImageResourceBuilder.publish()`:

```typescript
// DockerImageResource.ts
class DockerImageResourceBuilder extends SentinelFileBasedBuilder<...> {
  async publish(resource: ResourceInfo<DockerImageResourceConfig>, out?: Writable): Promise<void> {
    const reference = await this.getReference();
    const image = docker.getImage(reference);

    // Merge defaults with resource-specific config (resource wins)
    const defaults = this.monorepo.defaults.docker?.publish;
    const resourceConfig = resource.params?.publish;
    const publishConfig = {
      registry: resourceConfig?.registry ?? defaults?.registry,
      tag: resourceConfig?.tag ?? defaults?.tag,
    };

    // Retag if registry or tag override specified
    if (publishConfig.registry || publishConfig.tag) {
      await this.retag(reference, publishConfig);
    }

    const stream = await image.push({ authconfig: ... });
    await followProgress(stream);
  }
}
```

### 2. Create `PublishResourcesOperation`

Mirror the `BuildResourcesOperation` pattern:

```typescript
// src/monorepo/operations/resources/PublishResourcesOperation.ts
export class PublishResourcesOperation extends AbstractOperation<typeof schema, void> {
  protected async _run(input): Promise<void> {
    const publishable = monorepo.resources.filter(r => {
      // Must explicitly opt-in
      if (r.publish !== true) return false;

      // Builder must support publishing
      const builder = ResourceFactory.factor(r.type, { config: r, ... });
      return typeof builder.publish === 'function';
    });

    // Respect dependencies for publish order
    const ordered = findRunOrder(input.resources || publishable.map(r => r.id), collection);

    for (const resource of ordered) {
      const builder = ResourceFactory.factor(resource.type, { ... });
      await builder.publish(resource, this.out);
    }
  }
}
```

### 3. Add `emb resources publish` Command

```typescript
// src/cli/commands/resources/publish.ts
export default class ResourcesPublishCommand extends FlavoredCommand {
  static args = {
    resources: Args.string({ description: 'Resources to publish (defaults to all publishable)' })
  };

  static flags = {
    'dry-run': Flags.boolean({ description: 'Show what would be published' }),
  };

  async run() {
    const { monorepo } = getContext();
    return monorepo.run(new PublishResourcesOperation(process.stdout), {
      resources: argv.length > 0 ? argv : undefined,
      dryRun: flags['dry-run'],
    });
  }
}
```

### 4. Explicit Opt-In for Publishing

Resources must explicitly opt-in to publishing by setting `publish: true`:

```yaml
components:
  api:
    resources:
      image:
        type: docker/image
        publish: true  # Opt-in: this image will be published
        params:
          image: my-api

  dev-tools:
    resources:
      image:
        type: docker/image
        # No publish flag: this image won't be published
        params:
          image: dev-tools
```

This means:
- Resources are **not publishable by default**
- Set `publish: true` at resource level to include in `emb resources publish`
- Builder must also implement `publish()` for the resource type to support it
- `emb resources publish` only processes resources where `publish === true`

### 5. Defaults Configuration

Add `publish` settings to the existing `defaults.docker` section. This follows the current pattern where `defaults.docker.tag`, `defaults.docker.platform`, and `defaults.docker.buildArgs` are already supported.

```yaml
defaults:
  docker:
    tag: latest
    platform: linux/amd64
    buildArgs:
      NODE_ENV: production
    # NEW: publishing defaults
    publish:
      registry: ghcr.io/myorg
      tag: ${env:VERSION:-latest}  # Optional: override tag when publishing
```

**Precedence order** (most specific wins):
1. Resource-level `params.publish.*`
2. Defaults-level `defaults.docker.publish.*`
3. Built-in defaults (no registry prefix, use build tag)

### 6. Resource-Specific Publish Config

Individual resources can override the defaults:

```yaml
components:
  api:
    resources:
      image:
        type: docker/image
        publish: true  # Required to enable publishing
        params:
          image: my-api
          tag: ${env:VERSION:-latest}
          publish:
            registry: docker.io/mycompany  # Override default registry
            tag: ${env:RELEASE_TAG}        # Override default publish tag
```

This keeps the command generic while allowing type-specific configuration.

## Benefits

1. **Consistent abstraction**: `build` → `publish` works for all resource types
2. **Future-proof**: Easy to add new publishable resources:
   - `npm/package` → publish to npm registry
   - `s3/artifact` → upload to S3
   - `helm/chart` → push to chart repository
   - `oci/artifact` → push to OCI registry
3. **Plugin-friendly**: Custom resource types can define their own publish behavior
4. **Simpler CLI**: One command to rule them all
5. **Composable**: Can publish specific resources by ID or all publishable resources

## Migration Path

1. Keep `emb images push` as an alias (deprecated) for backwards compatibility
2. It internally calls `emb resources publish` filtered to `docker/image` types
3. Document the new approach
4. Remove `emb images push` in a future major version

## Design Decisions

### Publishing Caching

**Decision:** No caching - always publish when asked.

Publishing will not use the sentinel/caching system. When `emb resources publish` is called, it will always push. This matches the current `emb images push` behavior and avoids complexity around tracking remote registry state.

### Docker-Specific Commands

**Decision:** Keep `emb images prune` and `emb images delete` as Docker-specific.

These are management/cleanup commands that don't fit the resource build/publish lifecycle. They remain under `emb images` as Docker-specific utilities.

### Publishable Filter

**Decision:** Add `--publishable` flag to `emb resources list`.

This allows users to see which resources can be published:

```
$ emb resources list --publishable
  ID          TYPE          REFERENCE
  api:image   docker/image  myproject/api:latest
  web:image   docker/image  myproject/web:latest
```

## Implementation Order

1. Extend config schema to support `defaults.docker.publish` (registry, tag)
2. Add `publish()` to `DockerImageResourceBuilder` (reads from defaults + resource params)
3. Create `PublishResourcesOperation`
4. Add `emb resources publish` command
5. Add `--publishable` filter to `emb resources` list
6. Deprecate `emb images push` (keep working, add deprecation warning)
7. Update documentation
