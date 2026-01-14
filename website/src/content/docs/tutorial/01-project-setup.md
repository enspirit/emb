---
title: "Step 1: Project Setup"
description: Create your first EMB project configuration
---

# Step 1: Project Setup

Every EMB project starts with a `.emb.yml` configuration file at the project root.

## Minimal Configuration

The simplest configuration just needs a project name:

```yaml
# .emb.yml
project:
  name: my-project
```

That's it! EMB can now auto-discover components in your project.

## Adding Plugins

Plugins extend EMB's functionality. The most common ones are:

```yaml
project:
  name: tutorial

plugins:
  # Auto-discover components (folders with Dockerfiles)
  - name: autodocker

  # Load .env files
  - name: dotenv
    config:
      - .env

  # Load component Embfiles
  - name: embfiles
```

## Tutorial Configuration

Our tutorial project uses this configuration:

```shell exec cwd="tutorial"
cat .emb.yml
```

```output
# yaml-language-server: $schema=../../src/config/schema.json
#
# EMB Tutorial Project
# A minimal monorepo demonstrating EMB features progressively.
#
project:
  name: tutorial

plugins:
  # Auto-discover components (folders with Dockerfiles)
  - name: autodocker

  # Load .env files
  - name: dotenv
    config:
      - .env

  # Load component Embfiles
  - name: embfiles

# Environment variables available to all components
env:
  DOCKER_TAG: ${env:DOCKER_TAG:-latest}
  NODE_ENV: ${env:NODE_ENV:-development}

# Default Docker build settings
defaults:
  docker:
    tag: ${env:DOCKER_TAG}

# Project-level tasks
tasks:
  hello:
    description: Say hello from the tutorial
    script: |
      echo "Hello from the EMB tutorial!"
      echo "Components: api, web"

# Flavors for different environments
flavors:
  production:
    patches:
      - op: replace
        path: /env/NODE_ENV
        value: production
```

## Key Concepts

### Environment Variables

The `env` section defines variables available to all processes:

```yaml
env:
  DOCKER_TAG: ${env:DOCKER_TAG:-latest}
```

The `${env:VAR:-fallback}` syntax means: use the `VAR` environment variable if set, otherwise use the fallback value. In this case, `DOCKER_TAG` defaults to `latest` when not set.

### Defaults

The `defaults` section sets default values for all components:

```yaml
defaults:
  docker:
    tag: ${env:DOCKER_TAG}
```

This ensures all images are tagged consistently.

### Flavors

Flavors let you define environment-specific configurations using JSON Patch:

```yaml
flavors:
  production:
    patches:
      - op: replace
        path: /env/NODE_ENV
        value: production
```

## Next Step

Continue to [Step 2: Components](/tutorial/02-components) to learn how EMB discovers and manages your services.
