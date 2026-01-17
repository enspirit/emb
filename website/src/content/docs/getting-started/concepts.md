---
title: Concepts
description: Understanding the mental model and terminology used in EMB
---

Before diving into EMB, it helps to understand the key concepts and how they relate to each other.

## The Big Picture

EMB manages a **Monorepo** - a single repository containing multiple related services, applications, or libraries. Within this monorepo, EMB organizes everything around **Components**.

```
┌─────────────────────────────────────────────────────────┐
│                      Monorepo                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │  Component  │  │  Component  │  │  Component  │      │
│  │    (api)    │  │    (web)    │  │  (worker)   │      │
│  │             │  │             │  │             │      │
│  │ - Resources │  │ - Resources │  │ - Resources │      │
│  │ - Tasks     │  │ - Tasks     │  │ - Tasks     │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              docker-compose.yml                 │    │
│  │  (defines which components run as services)     │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Components

A **Component** is a logical unit of your project - typically a folder containing related code. Components are the primary way EMB organizes your monorepo.

By default, EMB auto-discovers components by looking for folders with a `Dockerfile`. You can also explicitly define components in your `.emb.yml` configuration.

Each component can have:
- **Resources** - things that can be built (Docker images, generated files)
- **Tasks** - commands that can be executed

## Resources

A **Resource** is something that can be built. The most common type is a Docker image, but resources can also be generated files.

Resources have:
- A **type** (`docker/image`, `file`, etc.)
- **Dependencies** on other resources (EMB builds them in the correct order)

Example: Your `api` component might have a Docker image resource that depends on a `base` image.

## Tasks

A **Task** is a command or script that can be executed. Tasks are defined per-component and are referenced using the format `component:taskname`.

```yaml
components:
  api:
    tasks:
      test:
        exec: npm test
      lint:
        exec: npm run lint
```

Run with: `emb run api:test`

## Services

**Services** are running containers defined in your `docker-compose.yml`. EMB doesn't manage the service definitions directly - it delegates to Docker Compose - but it provides convenient commands to interact with them.

When you run `emb up`, EMB:
1. Builds all required resources
2. Starts the services via Docker Compose

## Flavors

A **Flavor** represents a configuration variant for different environments (development, staging, production). Flavors allow you to modify your configuration without duplicating it.

```yaml
flavors:
  production:
    patch:
      - op: replace
        path: /components/api/resources/image/dockerfile
        value: Dockerfile.prod
```

Run with: `emb up --flavor production`

## Configuration File

All of this is configured in `.emb.yml` at the root of your monorepo. A minimal configuration might look like:

```yaml
name: my-project
```

With auto-discovery enabled (the default), EMB will find your components automatically. As your project grows, you can explicitly configure components, tasks, resources, and flavors.

## Summary

| Concept | What it is | Example |
|---------|-----------|---------|
| **Monorepo** | Your entire project repository | `my-project/` |
| **Component** | A logical unit (folder) in your project | `api/`, `web/` |
| **Resource** | Something that can be built | Docker image, generated file |
| **Task** | A command that can be executed | `npm test`, `./scripts/migrate.sh` |
| **Service** | A running container | api, postgres, redis |
| **Flavor** | A configuration variant | development, production |

Ready to put this into practice? Continue to [Installation](/emb/getting-started/installation).
