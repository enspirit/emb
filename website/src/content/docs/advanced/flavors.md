---
title: Flavors
description: Environment variants using JSON Patch
---

# Flavors

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

### Build with a Flavor

```shell skip
emb build --flavor production
```

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
- `emb build` builds the development stage
- `emb build --flavor production` builds the production stage

## Flavor Inheritance

When both project-level and component-level flavors with the same name exist, **both** are applied:

1. Project-level patches are applied first
2. Component-level patches are applied second

This allows you to:
- Set global environment changes at project level
- Set component-specific build changes at component level

## Viewing Flavor Configuration

To see what configuration a flavor produces:

```shell skip
emb config print --flavor production
```

This shows the fully resolved configuration after applying flavor patches.
