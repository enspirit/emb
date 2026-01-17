---
title: "JSON Patch"
description: Understanding JSON Patch operations for flavor configuration
---

Flavors use JSON Patch (RFC 6902) to modify configurations. This page explains the available operations.

## JSON Patch Basics

Each patch operation has:
- **op** - The operation type
- **path** - JSON Pointer to the target location
- **value** - The new value (for add/replace)

## The Replace Operation

Changes an existing value:

```yaml
patches:
  - op: replace
    path: /env/NODE_ENV
    value: production
```

Before:
```yaml
env:
  NODE_ENV: development
```

After:
```yaml
env:
  NODE_ENV: production
```

**Note**: The path must exist. Replacing a non-existent path is an error.

## The Add Operation

Adds a new property:

```yaml
patches:
  - op: add
    path: /env/NEW_VAR
    value: "hello"
```

Before:
```yaml
env:
  NODE_ENV: development
```

After:
```yaml
env:
  NODE_ENV: development
  NEW_VAR: hello
```

You can also add to nested paths:

```yaml
patches:
  - op: add
    path: /defaults/docker/buildArgs/VERSION
    value: "1.0.0"
```

## The Remove Operation

Removes a property:

```yaml
patches:
  - op: remove
    path: /env/DEBUG
```

Before:
```yaml
env:
  NODE_ENV: development
  DEBUG: "true"
```

After:
```yaml
env:
  NODE_ENV: development
```

## JSON Pointer Syntax

Paths use JSON Pointer format:

| Path | Target |
|------|--------|
| `/env/NODE_ENV` | `config.env.NODE_ENV` |
| `/defaults/docker/target` | `config.defaults.docker.target` |
| `/components/api/resources/image/params/target` | Deeply nested value |

Special characters in keys must be escaped:
- `~0` for `~`
- `~1` for `/`

## Multiple Patches

Patches are applied in order:

```yaml
flavors:
  production:
    patches:
      # First, change the environment
      - op: replace
        path: /env/NODE_ENV
        value: production

      # Then, adjust logging
      - op: replace
        path: /env/LOG_LEVEL
        value: warn

      # Finally, change the Docker target
      - op: replace
        path: /defaults/docker/target
        value: production
```

## Common Patterns

### Change Docker Target

```yaml
- op: replace
  path: /defaults/docker/target
  value: production
```

### Add Build Arguments

```yaml
- op: add
  path: /defaults/docker/buildArgs
  value:
    VERSION: "1.0.0"
    BUILD_DATE: "2024-01-01"
```

### Disable a Feature

```yaml
- op: replace
  path: /env/FEATURE_FLAG
  value: "false"
```

## Next Step

Continue to [Using Flavors](/emb/tutorial/production-ready/04-using-flavors/) to see how to use flavors in practice.
