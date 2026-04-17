---
title: Flavors
description: Environment variants using JSON Patch
---

Flavors allow you to define different configurations for different environments (development, staging, production) using JSON Patch (RFC 6902). Instead of duplicating configuration, you define a base config and patches that modify it.

## How Flavors Work

1. EMB loads your base configuration
2. When you specify a flavor with `--flavor`, EMB applies the patches
3. The patched configuration is used for the operation

## Defining Flavors

### Project-Level Flavors

Define flavors at the project level to affect global settings:

```yaml
# .emb.yml
env:
  DOCKER_TAG: ${env:DOCKER_TAG:-latest}

flavors:
  production:
    patches:
      - op: replace
        path: /env/DOCKER_TAG
        value: ${env:DOCKER_TAG}-production
```

### Component-Level Flavors

Define flavors within a component to change its build settings:

```yaml
# frontend/Embfile.yml
resources:
  image:
    type: docker/image
    params:
      target: development

flavors:
  production:
    patches:
      - op: replace
        path: /resources/image/params/target
        value: production
```

## JSON Patch Operations

Flavors use [JSON Patch RFC 6902](https://datatracker.ietf.org/doc/html/rfc6902). Common operations:

### Replace

Change an existing value:

```yaml
patches:
  - op: replace
    path: /resources/image/params/target
    value: production
```

### Add

Add a new property:

```yaml
patches:
  - op: add
    path: /resources/image/params/buildArgs/DEBUG
    value: "false"
```

### Remove

Remove a property:

```yaml
patches:
  - op: remove
    path: /resources/image/params/buildArgs/DEBUG
```

## Using Flavors

### Run Services with a Flavor

```shell skip
emb up --flavor production
```

### Run Tasks with a Flavor

```shell skip
emb run test --flavor production
```

## Example: Multi-Stage Docker Builds

A common pattern is using flavors for multi-stage Docker builds:

```dockerfile
# Dockerfile
FROM node:20 AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS production
RUN npm ci --only=production
COPY . .
CMD ["npm", "start"]
```

```yaml
# Embfile.yml
resources:
  image:
    type: docker/image
    params:
      target: development

flavors:
  production:
    patches:
      - op: replace
        path: /resources/image/params/target
        value: production
```

Now:
- `emb up` builds and runs the development stage
- `emb up --flavor production` builds and runs the production stage

You can also build resources explicitly with `emb resources build --flavor production`.

## Flavor Inheritance

When both project-level and component-level flavors with the same name exist, **both** are applied:

1. Project-level patches are applied first
2. Component-level patches are applied second

This allows you to:
- Set global environment changes at project level
- Set component-specific build changes at component level

## Extending Another Flavor

A flavor can inherit from another flavor of the same level using the `extends` field. The parent's patches are applied first, then the child's patches on top — so a child can override a parent value by emitting its own `replace`, or undo a parent `add` with its own `remove`.

```yaml
flavors:
  production:
    patches:
      - op: replace
        path: /env/NODE_ENV
        value: production
      - op: replace
        path: /env/LOG_LEVEL
        value: warn

  test:
    extends: production
    patches:
      # keep everything production does, but flip NODE_ENV
      - op: replace
        path: /env/NODE_ENV
        value: test
      # and drop the LOG_LEVEL the parent set
      - op: remove
        path: /env/LOG_LEVEL
```

Inheritance also works at the component level (a component flavor can extend another component flavor of the same component) and across multiple levels (`a → b → c`). Project-level `defaults` (such as `rebuildPolicy`) are deep-merged with child values winning. Cycles and references to unknown parents are rejected at load time.

## Viewing Flavor Configuration

To see what configuration a flavor produces:

```shell skip
emb config print --flavor production
```

This shows the fully resolved configuration after applying flavor patches.

## Rebuild Policies

Beyond JSON Patch, flavors can set a `defaults.rebuildPolicy` that changes
how EMB decides whether a resource needs a rebuild. Today this applies to
`docker/image` resources.

The common case: in dev, source is bind-mounted into containers via
`docker-compose.devel.yml`, so rebuilding the image on every source change
is pointless — the container already sees the new code. You only want a
rebuild when *image-shaping* files change (Dockerfile, package.json,
lockfiles, system-package lists).

Set a flavor-wide policy under `defaults.rebuildPolicy['docker/image']`:

```yaml
flavors:
  dev:
    defaults:
      rebuildPolicy:
        docker/image:
          strategy: watch-paths
          paths:
            - Dockerfile
            - package.json

  prod: {}   # absent → falls back to the builtin 'auto' strategy
```

Three strategies are available:

| Strategy | Rebuilds when | Typical use |
|----------|---------------|-------------|
| `auto` *(default)* | any git-tracked file in the docker context changed | CI, production |
| `always` | every invocation | images fetching external content at build time |
| `watch-paths` | one of the listed paths changed | dev with bind-mounted source |

### Overriding at the resource level

A resource's own `rebuildTrigger` wins against any flavor-level default:

```yaml
# component/Embfile.yml
resources:
  image:
    type: docker/image
    rebuildTrigger:
      strategy: always    # wins even when --flavor dev sets watch-paths
```

See the full precedence and path semantics in the
[configuration reference](../../reference/configuration#rebuild-triggers-dockerimage).
A runnable example lives under `examples/rebuild-triggers/`.
