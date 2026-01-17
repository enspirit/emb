---
title: "Flavors Introduction"
description: What flavors are and when to use them
---

Flavors let you define environment-specific configuration variants without duplicating your entire configuration.

## The Problem

Different environments need different settings:

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| NODE_ENV | development | staging | production |
| LOG_LEVEL | debug | info | warn |
| Docker target | development | development | production |

Without flavors, you'd need separate config files for each environment.

## The Solution: Flavors

Flavors define **patches** that modify your base configuration:

```yaml
flavors:
  production:
    patches:
      - op: replace
        path: /env/NODE_ENV
        value: production
```

When you use `--flavor production`, EMB:
1. Loads your base configuration
2. Applies the flavor's patches
3. Uses the modified configuration

## Viewing Available Flavors

List defined flavors:

```shell exec cwd="../examples/production-ready"
emb config print | grep -A 19 "^flavors:"
```

```output
flavors:
  staging:
    patches:
      - op: replace
        path: /env/NODE_ENV
        value: staging
      - op: replace
        path: /env/LOG_LEVEL
        value: info
  production:
    patches:
      - op: replace
        path: /env/NODE_ENV
        value: production
      - op: replace
        path: /env/LOG_LEVEL
        value: warn
      - op: replace
        path: /defaults/docker/target
        value: production
```

## Base vs Flavored Configuration

### Base Configuration

```shell exec cwd="../examples/production-ready"
emb config print | grep -A 3 "^env:"
```

```output
env:
  DOCKER_TAG: ${env:DOCKER_TAG:-latest}
  NODE_ENV: ${env:NODE_ENV:-development}
  LOG_LEVEL: ${env:LOG_LEVEL:-debug}
```

### With Production Flavor

```shell exec cwd="../examples/production-ready"
emb config print --flavor production | grep -A 3 "^env:"
```

```output
env:
  DOCKER_TAG: ${env:DOCKER_TAG:-latest}
  NODE_ENV: production
  LOG_LEVEL: warn
```

Notice how `NODE_ENV` and `LOG_LEVEL` changed from templates to fixed production values!

## When to Use Flavors

Flavors are ideal for:

- **Environment differences** - dev/staging/production settings
- **Feature flags** - enabling/disabling features per environment
- **Resource sizing** - different memory limits, replicas
- **Docker targets** - development vs production builds

## Component-Level Flavors

Components can also define flavors in their Embfiles:

```shell exec cwd="../examples/production-ready"
cat api/Embfile.yml | head -15
```

```output
description: Production-ready API with multi-stage builds

resources:
  image:
    type: docker/image
    params:
      target: development

tasks:
  test:
    description: Run tests
    pre:
      - lint
    script: npm test
```

When both project and component define the same flavor, both sets of patches are applied (project first, then component).

## Next Step

Continue to [JSON Patch](/emb/tutorial/production-ready/03-json-patch/) to learn about the patch operations in detail.
