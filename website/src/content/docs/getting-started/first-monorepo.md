---
title: Your First Monorepo
description: Set up and explore your first EMB-managed monorepo
---

# Your First Monorepo

Let's explore EMB using a sample monorepo. We'll use the `examples/` folder that comes with EMB.

## Project Structure

A minimal EMB monorepo looks like this:

```
examples/
├── simple/
│   ├── Dockerfile
│   └── index.html
├── frontend/
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

That's it! EMB auto-discovers any folder containing a `Dockerfile` as a component.

## Discovering Components

Let's see what EMB finds in our example project:

```shell exec cwd="../examples"
emb config print | head -20
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
```

EMB automatically discovered all components with Dockerfiles and created image resources for them.

## Listing Tasks

Components can define tasks. Let's see what tasks are available:

```shell exec cwd="../examples"
emb tasks
```

```output

  NAME        COMPONENT   DESCRIPTION               ID
  dependent                                         dependent
  greet                                             greet
  prereq                                            prereq
  test        buildargs                             buildargs:test
  test        dependent                             dependent:test
  fail        frontend    A task that will fail     frontend:fail
  test        frontend    A simple unit test task   frontend:test
  confirm     simple                                simple:confirm
  inspect     simple                                simple:inspect
  sudo        simple                                simple:sudo
  release     utils                                 utils:release
```

## What's Next?

Now that you understand the basics:

- Learn about [building images](/day-to-day/building-images)
- Learn about [running services](/day-to-day/running-services)
- Explore [component configuration](/advanced/components)
