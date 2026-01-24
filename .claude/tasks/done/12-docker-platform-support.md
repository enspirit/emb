# Docker Image Platform Support

**Status:** Completed (2026-01-23)

## Summary

Added support for specifying target platform/architecture when building Docker images.

## Files Changed

- `src/config/schema.json` - Added `platform` to `DockerImageConfig` and `DefaultsConfig.docker`
- `src/docker/operations/images/BuildImageOperation.ts` - Added `platform` to Zod schema, CLI args (`--platform`), and dockerode options
- `src/docker/resources/DockerImageResource.ts` - Maps platform from config with fallback to defaults
- `src/config/schema.ts` - Regenerated TypeScript types
- `examples/production-ready/api/Dockerfile` - Fixed COPY instruction that incorrectly used shell operators
- `tests/integration/features/build/platform.docker.spec.ts` - Integration tests verifying image platform

## Usage

### Project-wide default

```yaml
defaults:
  docker:
    platform: linux/amd64
```

### Per-resource override

```yaml
resources:
  image:
    type: docker/image
    params:
      platform: linux/arm64
```

### Using flavors for production builds

With env var override for CI/testing:
```yaml
flavors:
  production:
    patches:
      - op: add
        path: /defaults/docker/platform
        value: ${env:DOCKER_PLATFORM:-linux/amd64}
```

This allows CI systems to override the target platform via `DOCKER_PLATFORM` env var while defaulting to `linux/amd64`.

## Integration Tests

The tests in `tests/integration/features/build/platform.docker.spec.ts` dynamically detect the host architecture and verify:
1. **Native platform** - Default builds use the host's native architecture
2. **Foreign platform** - Production flavor builds use a foreign architecture (amd64 on arm64 hosts, arm64 on amd64 hosts)

This ensures the platform feature works correctly on both Intel/AMD and Apple Silicon machines.

## Documentation Updated

- `website/src/content/docs/reference/configuration.md` - Added platform to defaults and resource params
- `website/src/content/docs/tutorial/production-ready/02-flavors-intro.md` - Updated example output
- `website/src/content/docs/tutorial/production-ready/03-json-patch.md` - Added "Set Target Platform" pattern

## Example Updated

- `examples/production-ready/.emb.yml` - Production flavor now sets platform to `linux/amd64`

## Common Platform Values

- `linux/amd64` - Standard x86-64 (most servers, Intel/AMD)
- `linux/arm64` - ARM 64-bit (Apple Silicon, AWS Graviton, Raspberry Pi 4)
- `linux/arm/v7` - ARM 32-bit (older Raspberry Pi)
