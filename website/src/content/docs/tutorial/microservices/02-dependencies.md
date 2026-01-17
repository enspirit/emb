---
title: "Dependencies"
description: Declaring and understanding component dependencies
---

When one component's image depends on another, you need to tell EMB so it builds them in the right order.

## Declaring Dependencies

In a component's Embfile, use the `dependencies` array:

```shell exec cwd="../examples/microservices"
cat worker/Embfile.yml
```

```output
description: Background job worker

resources:
  image:
    type: docker/image
    dependencies:
      - base:image

tasks:
  test:
    description: Run worker tests
    script: npm test

  scale:
    description: Show scaling info
    script: echo "Worker concurrency is controlled by WORKER_CONCURRENCY env var"
    executors:
      - local
```

The key part is:

```yaml
resources:
  image:
    type: docker/image
    dependencies:
      - base:image    # Build base:image first
```

This tells EMB: "Before building `worker:image`, make sure `base:image` is built."

## Dependency Format

Dependencies use the format `component:resource`:

- `base:image` - The `image` resource of the `base` component
- `api:image` - The `image` resource of the `api` component

## Viewing Dependencies

See all resources and their dependencies:

```shell exec cwd="../examples/microservices"
emb resources
```

```output
 ID             NAME   TYPE          REFERENCE
------------------------------------------------------------------
 api:image      image  docker/image  microservices/api:latest
 base:image     image  docker/image  microservices/base:latest
 gateway:image  image  docker/image  microservices/gateway:latest
 worker:image   image  docker/image  microservices/worker:latest
```

## The API Component

The API also depends on base:

```shell exec cwd="../examples/microservices"
cat api/Embfile.yml
```

```output
description: REST API service

resources:
  image:
    type: docker/image
    dependencies:
      - base:image

tasks:
  test:
    description: Run API tests
    pre:
      - lint
    script: npm test

  lint:
    description: Run linter
    script: npm run lint
```

Both `api` and `worker` depend on `base`, meaning `base` must be built first.

## Why Declare Dependencies?

Without explicit dependencies, EMB might try to build `worker` before `base` exists, causing the build to fail. Dependencies ensure:

1. **Correct build order** - Parents built before children
2. **Parallel optimization** - Independent components can build simultaneously
3. **Rebuild detection** - If `base` changes, dependents are rebuilt

## Next Step

Continue to [Build Ordering](/emb/tutorial/microservices/03-build-ordering/) to see how EMB resolves the complete build graph.
