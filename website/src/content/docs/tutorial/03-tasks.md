---
title: "Step 3: Tasks"
description: Defining and running tasks in your monorepo
---

# Step 3: Tasks

Tasks are scripts you can run across your monorepo. They can be defined at the project level or within components.

## Listing Tasks

Let's see what tasks are available in our tutorial:

```shell exec cwd="tutorial"
emb tasks
```

```output

  NAME     COMPONENT   DESCRIPTION                   ID
  hello                Say hello from the tutorial   hello
  health   api         Check API health              api:health
  test     api         Run API tests                 api:test
```

## Task Types

### Project-Level Tasks

Defined in `.emb.yml`, these run in the project context:

```yaml
# .emb.yml
tasks:
  hello:
    description: Say hello from the tutorial
    script: |
      echo "Hello from the EMB tutorial!"
```

### Component Tasks

Defined in a component's `Embfile.yml`, these can run in the component's container:

```yaml
# api/Embfile.yml
tasks:
  test:
    description: Run API tests
    script: npm test
```

## Running Tasks

Run a task by its ID:

```shell skip
emb run hello
```

For component tasks:

```shell skip
emb run api:test
```

## Task Options

### Executors

Control where a task runs:

```yaml
tasks:
  health:
    executors:
      - local  # Run on your machine, not in a container
    script: |
      curl -s http://localhost:3000
```

### Variables

Pass variables to tasks:

```yaml
tasks:
  greet:
    vars:
      NAME: ${env:USER:-world}
    script: |
      echo "Hello $NAME!"
```

### Description

Add descriptions for discoverability:

```yaml
tasks:
  test:
    description: Run the test suite
    script: npm test
```

## Next Step

Continue to [Step 4: Building](/tutorial/04-building) to learn how to build Docker images.
