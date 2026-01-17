---
title: "Production Ready"
description: Learn flavors and multi-stage builds for environment-specific deployments
---

This tutorial covers the final piece of the EMB puzzle: managing different configurations for development, staging, and production environments.

## What's New in This Tutorial

- **Multi-stage Dockerfiles** - Different targets for dev vs production
- **Flavors** - Environment-specific configuration variants
- **JSON Patch** - Surgical modifications to your configuration

## The Example Project

We'll use `examples/production-ready`:

```
production-ready/
├── .emb.yml           # Project configuration with flavors
├── .env               # Base environment variables
├── .env.production    # Production overrides
├── docker-compose.yml
├── api/
│   ├── Dockerfile     # Multi-stage: base, development, builder, production
│   ├── Embfile.yml    # Component flavors
│   ├── package.json
│   └── server.js
└── web/
    ├── Dockerfile     # Multi-stage: development, production
    ├── Embfile.yml    # Component flavors
    ├── index.html
    ├── nginx.conf     # Development nginx config
    └── nginx.prod.conf # Production nginx config
```

## Project Configuration

Let's look at the flavors configuration:

```shell exec cwd="../examples/production-ready"
cat .emb.yml
```

```output
project:
  name: production-ready

plugins:
  - name: autodocker
  # Load environment variables from .env files into the configuration.
  # Files are loaded in order; later files override earlier ones.
  # - .env: Base environment variables (committed to git)
  # - .env.local: Local overrides (gitignored, for developer-specific settings)
  - name: dotenv
    config:
      - .env
      - .env.local
  - name: embfiles

env:
  DOCKER_TAG: ${env:DOCKER_TAG:-latest}
  NODE_ENV: ${env:NODE_ENV:-development}
  LOG_LEVEL: ${env:LOG_LEVEL:-debug}

defaults:
  docker:
    tag: ${env:DOCKER_TAG}
    target: development

# Flavors allow environment-specific configuration variants.
# Use --flavor <name> to activate a flavor: emb resources build --flavor production
#
# Each flavor defines patches using JSON Patch (RFC 6902) operations:
# - op: The operation (replace, add, remove)
# - path: JSON Pointer to the value to modify
# - value: The new value
#
# Patches are applied to the base configuration, allowing you to override
# env vars, docker settings, or any other config for different environments.
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

## Tutorial Pages

1. [Multi-Stage Builds](/emb/tutorial/production-ready/01-multi-stage/) - Dockerfile targets for different environments
2. [Flavors Introduction](/emb/tutorial/production-ready/02-flavors-intro/) - What flavors are and when to use them
3. [JSON Patch](/emb/tutorial/production-ready/03-json-patch/) - The patch operations in detail
4. [Using Flavors](/emb/tutorial/production-ready/04-using-flavors/) - Running builds and services with flavors

## Prerequisites

You should have completed the [Microservices tutorial](/emb/tutorial/microservices/) first.
