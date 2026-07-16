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

## Building in Parallel

Step 3 above is the default: one resource at a time. Since `api` and `worker` don't
depend on each other, they can just as well build at the same time:

```shell skip
emb resources build --jobs 2
```

Now `base` builds first, then `api` and `worker` build concurrently — the dependency
edges are still honoured, so nothing starts before its dependencies have succeeded.
Use `--jobs auto` to let EMB pick (min of your CPU count and 4), or set it once for
the project:

```yaml
defaults:
  build:
    concurrency: auto
```

The `--jobs` flag overrides the config. Parallelism only helps where the graph is
wide: a chain of resources that each depend on the previous one builds at the same
speed no matter what you pass.

## When a Build Fails

By default EMB is fail-fast: at the first failure it stops starting new resources,
lets running ones finish, and skips the rest. Add `--keep-going` to build everything
that doesn't depend on the failure instead:

```shell skip
emb resources build --jobs auto --keep-going
```

If `base` fails, `api` and `worker` are skipped — they depend on it, so building them
would be pointless. But an independent component like `gateway` still builds. Either
way the command exits non-zero and ends with a summary naming what failed and what
was skipped as a result.

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
- **Parallel builds** - `--jobs` to build independent resources concurrently, `--keep-going` to push past failures

## Next Tutorial

Ready to learn about environment-specific configurations? Continue to [Production Ready](/emb/tutorial/production-ready/) to explore:
- Multi-stage Docker builds
- Flavors for different environments
- JSON Patch operations
