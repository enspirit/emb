---
title: "Using Flavors"
description: Running builds and services with flavor configurations
---

Now that you understand flavors and JSON Patch, let's see how to use them in practice.

## The --flavor Flag

Most EMB commands accept the `--flavor` flag:

```shell skip
emb <command> --flavor production
```

The flag comes after the command.

## Building with Flavors

Build production images:

```shell skip
emb resources build --flavor production
```

This applies the production flavor, changing:
- Docker target from `development` to `production`
- Environment variables as configured

## Viewing Flavor Effects

Compare base vs flavored configuration:

```shell skip
# Base configuration
emb config print

# With production flavor
emb config print --flavor production
```

Check specific values using the defaults section:

```shell exec cwd="../examples/production-ready"
emb config print | grep -A 3 "^defaults:"
```

```output
defaults:
  docker:
    tag: ${env:DOCKER_TAG}
    target: development
```

```shell exec cwd="../examples/production-ready"
emb config print --flavor production | grep -A 3 "^defaults:"
```

```output
defaults:
  docker:
    tag: ${env:DOCKER_TAG}
    target: production
```

## Running with Flavors

Start services with production settings:

```shell skip
emb up --flavor production
```

This:
1. Applies the flavor patches
2. Builds images with the production target
3. Starts services with production environment variables

## Flavor in CI/CD

Flavors are perfect for CI/CD pipelines:

```bash
# Development builds (default)
emb resources build
emb up -d
npm test

# Staging deployment
emb resources build --flavor staging
docker push myregistry/app:staging

# Production deployment
emb resources build --flavor production
docker push myregistry/app:latest
```

## Component-Level Flavor Patches

Components can add their own flavor patches:

```shell exec cwd="../examples/production-ready"
cat api/Embfile.yml | grep -A 5 "^flavors:"
```

```output
flavors:
  production:
    patches:
      - op: replace
        path: /resources/image/params/target
        value: production
```

This ensures the API uses the production Docker target when building with `--flavor production`.

## Flavor Inheritance

When both project and component define the same flavor:

1. Project-level patches apply first
2. Component-level patches apply second

This lets you:
- Set global defaults at project level
- Override specific components as needed

## Summary

You've completed the EMB tutorials! You now know how to:

- **Hello World**: Minimal configuration and auto-discovery
- **Fullstack App**: Tasks, environment variables, Docker Compose
- **Microservices**: Dependencies and build ordering
- **Production Ready**: Multi-stage builds and flavors

## Next Steps

- Check the [Advanced documentation](/emb/advanced/tasks/) for executors, interactive tasks, and more
- Learn about [Secrets Management](/emb/advanced/secrets/) for Vault integration
- Read the [Reference](/emb/reference/configuration/) for complete configuration options

Happy building!
