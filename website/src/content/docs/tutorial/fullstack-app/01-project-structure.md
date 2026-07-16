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

The `NAME`, `ID`, `CREATED` and `STATUS` columns are filled in from Docker, so they stay empty until the containers are running.

Both were auto-discovered by the `autodocker` plugin. But where do their descriptions and tasks come from?

## Component Embfiles

Each component can have an `Embfile.yml` that adds component-specific configuration:

```shell exec cwd="../examples/fullstack-app"
cat api/Embfile.yml
```

```output
description: REST API backend service

resources:
  fixture.txt:
    type: file
    params:
      path: .emb/fixture.txt
      content: fixture-ok

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

  uses-fixture:
    description: Reads a file produced by a resource dependency (bare name)
    executors: [local]
    dependencies: ['fixture.txt']
    script: |
      grep fixture-ok .emb/fixture.txt

  uses-fixture-qualified:
    description: Reads a file produced by a resource dependency (qualified id)
    executors: [local]
    dependencies: ['api:fixture.txt']
    script: |
      grep fixture-ok .emb/fixture.txt
```

The `embfiles` plugin loads these files and merges them with the auto-discovered configuration.

Alongside tasks, this Embfile declares a `fixture.txt` resource of type `file`, and two tasks that depend on it. A task's `dependencies` can name a resource either by its bare name (`fixture.txt`) or by its qualified id (`api:fixture.txt`) - EMB builds the resource before running the task.

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
emb config print | head -51
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
    description: REST API backend service
    resources:
      image:
        type: docker/image
        params: {}
      fixture.txt:
        type: file
        params:
          path: .emb/fixture.txt
          content: fixture-ok
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
      uses-fixture:
        description: Reads a file produced by a resource dependency (bare name)
        executors:
          - local
        dependencies:
          - fixture.txt
        script: |
          grep fixture-ok .emb/fixture.txt
      uses-fixture-qualified:
        description: Reads a file produced by a resource dependency (qualified id)
        executors:
          - local
        dependencies:
          - api:fixture.txt
        script: |
          grep fixture-ok .emb/fixture.txt
    rootDir: api
defaults: {}
```

## Next Step

Continue to [Environment Variables](/emb/tutorial/fullstack-app/02-environment/) to learn about the dotenv plugin and variable expansion.
