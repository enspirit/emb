---
title: Building Resources
description: How to build resources with EMB
---

EMB manages buildable resources across your monorepo. Resources are artifacts that can be built from your components, such as Docker images or files.

## Resource Types

EMB supports the following resource types:

- **docker/image** - Docker images built from Dockerfiles
- **file** - Generated files

Each resource has:
- A **type** (e.g., `docker/image` or `file`)
- A unique **ID** (e.g., `api:image` or `web:config`)
- A **reference** - what the builder exposes after building (e.g., `myproject/api:latest` for Docker images)

## View All Resources

To see all resources defined in your project:

```shell skip
emb resources
```

## Build All Resources

To build all resources in your monorepo:

```shell skip
emb resources build
```

This command:
1. Discovers all resources across components
2. Resolves dependencies between resources
3. Builds resources in the correct order
4. Caches results to avoid unnecessary rebuilds

## Build Specific Resources

To build a single resource by ID:

```shell skip
emb resources build api:image
```

To build multiple specific resources:

```shell skip
emb resources build api:image web:image
```

## Force Rebuild

EMB uses sentinels to track what's been built. To force a rebuild:

```shell skip
emb resources build --force
```

Or clean the sentinels first:

```shell skip
emb clean
emb resources build
```

## Build with Flavors

Different environments often need different build configurations. Use flavors:

```shell skip
emb resources build --flavor production
```

See [Flavors](/advanced/flavors) for more details on configuring build variants.

## Next Steps

- Learn about [running services](/day-to-day/running-services)
- Understand [component configuration](/day-to-day/managing-components)
