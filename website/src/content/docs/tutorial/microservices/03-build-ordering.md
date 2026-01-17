---
title: "Build Ordering"
description: How EMB resolves the build order for dependent components
---

When you run `emb resources build`, EMB analyzes dependencies and determines the correct build order.

## The Dependency Graph

Our microservices project has this dependency structure:

```
base
 ├── api (depends on base)
 └── worker (depends on base)

gateway (no dependencies)
```

When you run `emb resources build`:

1. **base** builds first (no dependencies)
2. **api** and **worker** build after base completes
3. **gateway** can build at any point (no dependencies)

EMB guarantees dependencies are built before their dependents. The order of independent components (like `gateway`) is not guaranteed.

## Building All Resources

```shell skip
emb resources build
```

EMB will:
1. Analyze the dependency graph
2. Determine a valid build order
3. Build each component one by one
4. Ensure dependencies complete before dependents

## Building a Single Component

When you build a specific component:

```shell skip
emb resources build worker
```

EMB automatically builds dependencies first:
1. Checks if `base:image` exists and is up-to-date
2. Builds `base:image` if needed
3. Then builds `worker:image`

## Dry Run

See what would be built without actually building:

```shell skip
emb resources build --dry-run
```

This shows the build order and what images would be created.

## Circular Dependencies

EMB detects and reports circular dependencies. If you accidentally create:

```yaml
# api/Embfile.yml
resources:
  image:
    dependencies:
      - worker:image

# worker/Embfile.yml
resources:
  image:
    dependencies:
      - api:image
```

EMB will fail with a clear error message explaining the cycle.

## Cache and Rebuilds

EMB tracks when images were last built. It rebuilds when:
- Source files have changed
- A dependency was rebuilt
- You use `--force`

## Summary

You've learned about microservices patterns in EMB:

- **Base images** - Shared foundations for consistency
- **Dependencies** - Declaring build order requirements
- **Build ordering** - Automatic resolution of the dependency graph

## Next Tutorial

Ready to learn about environment-specific configurations? Continue to [Production Ready](/emb/tutorial/production-ready/) to explore:
- Multi-stage Docker builds
- Flavors for different environments
- JSON Patch operations
