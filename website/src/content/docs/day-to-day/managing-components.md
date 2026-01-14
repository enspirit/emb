---
title: Managing Components
description: How to manage components in your monorepo
---

Components are the building blocks of an EMB monorepo. Each component represents a service or tool that can be built and run.

## Auto-Discovery

By default, EMB auto-discovers components by looking for:
- Folders containing a `Dockerfile`
- Folders with an `.emb.yml` configuration file

## Listing Components

View all discovered components (requires Docker to be running):

```shell skip cwd="../examples"
emb components
```

This will show a table with component names, image names, and container status.

## Component Configuration

Each component can have its own `.emb.yml` file in its folder. For example:

```yaml
# api/.emb.yml
resources:
  image:
    type: docker/image
    params:
      target: development
      buildArgs:
        NODE_ENV: development

tasks:
  test:
    script: npm run test

  lint:
    script: npm run lint
```

## View Component Config

See the full configuration for all components:

```shell exec cwd="../examples"
emb config print | head -26
```

```output
components:
  base:
    rootDir: base
    resources:
      image:
        type: docker/image
        params: {}
  autodocker:
    rootDir: autodocker
    resources:
      image:
        type: docker/image
        params: {}
  verbose:
    resources:
      image:
        type: docker/image
        dependencies:
          - base:image
        params:
          buildArgs:
            BASE_IMAGE: emb/base:${env:DOCKER_TAG}
            SOME_ARG: some-value
          target: development
      local.env:
        type: file
```

## Component Resources

Components can define resources like:

- **docker/image** - A Docker image to build
- **file** - A file to generate

## Next Steps

- Learn about [running tasks](/advanced/tasks)
- Understand [flavors for different environments](/advanced/flavors)
