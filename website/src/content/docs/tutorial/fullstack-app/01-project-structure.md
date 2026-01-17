---
title: "Project Structure"
description: Multi-component projects and Embfiles
---

When your project has multiple components, you can configure each one individually using Embfiles.

## Multiple Components

Our fullstack app has two components:

```shell exec cwd="../examples/fullstack-app"
emb components
```

```output
 COMPONENT  NAME  ID  CREATED  STATUS
--------------------------------------
 web
 api
```

Both were auto-discovered by the `autodocker` plugin. But where do their descriptions and tasks come from?

## Component Embfiles

Each component can have an `Embfile.yml` that adds component-specific configuration:

```shell exec cwd="../examples/fullstack-app"
cat api/Embfile.yml
```

```output
description: REST API backend service

tasks:
  test:
    description: Run API tests
    script: npm test

  lint:
    description: Run linter on API code
    script: npm run lint

  fail:
    description: A task that will fail
    script: exit 1
```

The `embfiles` plugin loads these files and merges them with the auto-discovered configuration.

## The embfiles Plugin

To enable Embfile loading, add the plugin to your `.emb.yml`:

```yaml
plugins:
  - name: autodocker
  - name: embfiles    # Load Embfile.yml from each component
```

The order matters - `autodocker` discovers components first, then `embfiles` enriches them with additional configuration.

## What Embfiles Can Define

Component Embfiles can include:

- **description** - Human-readable description
- **resources** - Additional or modified resources
- **tasks** - Component-specific tasks
- **flavors** - Component-level flavor patches

## Viewing Merged Configuration

To see how everything comes together:

```shell exec cwd="../examples/fullstack-app"
emb config print | head -30
```

```output
components:
  web:
    resources:
      image:
        type: docker/image
        params: {}
    description: Web frontend served by nginx
    tasks:
      test:
        description: Run frontend tests
        script: echo 'Running frontend tests...' && exit 0
    rootDir: web
  api:
    resources:
      image:
        type: docker/image
        params: {}
    description: REST API backend service
    tasks:
      test:
        description: Run API tests
        script: npm test
      lint:
        description: Run linter on API code
        script: npm run lint
      fail:
        description: A task that will fail
        script: exit 1
    rootDir: api
defaults: {}
```

## Next Step

Continue to [Environment Variables](/emb/tutorial/fullstack-app/02-environment/) to learn about the dotenv plugin and variable expansion.
