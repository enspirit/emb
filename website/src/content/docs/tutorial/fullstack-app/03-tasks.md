---
title: "Tasks"
description: Defining and running tasks at project and component levels
---

Tasks are scripts you can run across your monorepo. They can be defined at the project level (in `.emb.yml`) or at the component level (in `Embfile.yml`).

## Listing Tasks

View all available tasks:

```shell exec cwd="../examples/fullstack-app"
emb tasks
```

```output
 NAME   COMPONENT  DESCRIPTION                         ID
----------------------------------------------------------------
 build             Build the entire project            build
 deps              Install project dependencies        deps
 setup             Set up the development environment  setup
 fail   api        A task that will fail               api:fail
 lint   api        Run linter on API code              api:lint
 test   api        Run API tests                       api:test
 test   web        Run frontend tests                  web:test
```

Tasks without a component are project-level tasks. Tasks with a component (like `api:test`) are component-specific.

## Project-Level Tasks

Defined in `.emb.yml`, these run in the project root context:

```yaml
tasks:
  setup:
    description: Set up the development environment
    script: |
      echo "Setting up $ENV environment"
```

Run with:

```shell skip
emb run setup
```

## Component Tasks

Defined in a component's `Embfile.yml`:

```yaml
# api/Embfile.yml
tasks:
  test:
    description: Run API tests
    script: npm test
```

Run with the full task ID:

```shell skip
emb run api:test
```

## Task Variables

Tasks can define their own variables:

```yaml
tasks:
  setup:
    vars:
      ENV: ${env:NODE_ENV:-development}
    script: |
      echo "Setting up $ENV environment"
```

The `vars` section defines variables available to the script. They can reference environment variables with defaults.

## Task Prerequisites

Tasks can depend on other tasks:

```yaml
tasks:
  deps:
    description: Install project dependencies
    script: |
      echo "Installing dependencies..."

  build:
    description: Build the entire project
    pre: ['deps']
    script: |
      echo "Building project..."
```

When you run `emb run build`, EMB automatically runs `deps` first.

## Running Tasks

Run a project-level task:

```shell skip
emb run setup
```

This outputs:
```
Setting up development environment
```

Run a component task:

```shell skip
emb run api:test
```

## Task Output

By default, task output is displayed in real-time. Task logs are also saved to `.emb/default/logs/tasks/`.

## Handling Failures

If a task fails, EMB reports the error:

```shell skip
emb run api:fail
```

This would exit with a non-zero code, useful for CI/CD pipelines.

## Next Step

Continue to [Docker Compose](/emb/tutorial/fullstack-app/04-docker-compose/) to learn about running multi-service applications.
