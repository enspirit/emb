---
title: "Step 6: Flavors"
description: Environment-specific configurations with flavors
---

# Step 6: Flavors

Flavors let you define different configurations for different environments (development, staging, production) using JSON Patch.

## How Flavors Work

Instead of duplicating configuration, you define a base config and patches that modify it:

```yaml
# Base configuration
env:
  NODE_ENV: development

# Flavor that patches for production
flavors:
  production:
    patches:
      - op: replace
        path: /env/NODE_ENV
        value: production
```

## Project-Level Flavors

Our tutorial defines a production flavor in `.emb.yml`:

```yaml
flavors:
  production:
    patches:
      - op: replace
        path: /env/NODE_ENV
        value: production
```

## Component-Level Flavors

Components can also define flavors. The API component changes its build target:

```yaml
# api/Embfile.yml
resources:
  image:
    params:
      target: development

flavors:
  production:
    patches:
      - op: replace
        path: /resources/image/params/target
        value: production
```

## Using Flavors

Build with a flavor:

```shell skip
emb resources build --flavor production
```

Run with a flavor:

```shell skip
emb up --flavor production
```

View configuration with a flavor:

```shell skip
emb config print --flavor production
```

## Flavor Inheritance

When both project-level and component-level flavors exist with the same name, **both** are applied:

1. Project-level patches first
2. Component-level patches second

This lets you:
- Set global environment changes at project level
- Set component-specific changes at component level

## JSON Patch Operations

Flavors use JSON Patch (RFC 6902):

### Replace

Change an existing value:

```yaml
- op: replace
  path: /env/NODE_ENV
  value: production
```

### Add

Add a new property:

```yaml
- op: add
  path: /env/DEBUG
  value: "false"
```

### Remove

Remove a property:

```yaml
- op: remove
  path: /env/DEBUG
```

## Tutorial Complete!

Congratulations! You've learned the core concepts of EMB:

1. **Project Setup** - Configuration with `.emb.yml`
2. **Components** - Auto-discovery and Embfiles
3. **Tasks** - Running scripts across your monorepo
4. **Building** - Docker image builds with dependencies
5. **Running** - Service orchestration with Docker Compose
6. **Flavors** - Environment-specific configurations

## Next Steps

- Explore the [Advanced guides](/advanced/tasks) for more features
- Check the [Reference](/reference/configuration) for complete documentation
- Look at the `examples/` folder for real-world patterns
