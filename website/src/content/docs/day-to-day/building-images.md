---
title: Building Images
description: How to build Docker images with EMB
---

# Building Images

EMB makes it easy to build Docker images for all your components.

## Build All Images

To build all images in your monorepo:

```shell skip
emb build
```

This command:
1. Discovers all components with Docker images
2. Resolves dependencies between images
3. Builds images in the correct order
4. Caches results to avoid unnecessary rebuilds

## Build Specific Components

To build a single component:

```shell skip
emb build api
```

To build multiple specific components:

```shell skip
emb build api web
```

## Force Rebuild

EMB uses sentinels to track what's been built. To force a rebuild:

```shell skip
emb build --force
```

Or clean the sentinels first:

```shell skip
emb clean
emb build
```

## View Built Images

After building, see your images:

```shell skip
emb images
```

## Build with Flavors

Different environments often need different build configurations. Use flavors:

```shell skip
emb build --flavor production
```

See [Flavors](/advanced/flavors) for more details on configuring build variants.

## Next Steps

- Learn about [running services](/day-to-day/running-services)
- Understand [component configuration](/day-to-day/managing-components)
