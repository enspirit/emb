---
title: Tasks
description: Define and run tasks in your monorepo
---

Tasks are scripts that can be executed within the context of your monorepo. They can run locally or inside containers, have dependencies on other tasks, and use variables.

## Listing Tasks

View all available tasks in your project:

```shell exec cwd="../examples"
emb tasks
```

```output
 NAME       COMPONENT  DESCRIPTION              ID
---------------------------------------------------------------
 dependent                                      dependent
 greet                                          greet
 prereq                                         prereq
 test       buildargs                           buildargs:test
 test       dependent                           dependent:test
 fail       frontend   A task that will fail    frontend:fail
 test       frontend   A simple unit test task  frontend:test
 confirm    simple                              simple:confirm
 inspect    simple                              simple:inspect
 sudo       simple                              simple:sudo
 release    utils                               utils:release
```

Tasks can be defined at the project level or within components.

## Defining Tasks

### Simple Task

The simplest task is just a script:

```yaml
# In .emb.yml or component's .emb.yml
tasks:
  greet:
    script: |
      echo "Hello world!"
```

### Task with Description

Add a description to help others understand what the task does:

```yaml
tasks:
  test:
    description: Run the test suite
    script: |
      npm run test
```

### Task with Variables

Tasks can use variables with defaults:

```yaml
tasks:
  greet:
    vars:
      USER: ${env:USER:-world}
    script: |
      echo "Hello $USER!"
```

The `${env:USER:-world}` syntax means: use the `USER` environment variable, or default to `world`.

## Running Tasks

Run a task by its ID:

```shell skip
emb run greet
```

For component tasks, use the full ID:

```shell skip
emb run frontend:test
```

Or specify the component:

```shell skip
emb run test --component frontend
```

## Task Dependencies

Tasks can depend on other tasks using `pre`:

```yaml
tasks:
  prereq:
    script: |
      echo "I run first"

  dependent:
    pre:
      - prereq
    script: |
      echo "I run after prereq"
```

When you run `dependent`, EMB automatically runs `prereq` first.

## Executors

By default, component tasks run inside the component's container. You can change this:

```yaml
tasks:
  inspect:
    executors:
      - local
    script: |
      echo "This runs on your machine, not in a container"
```

Available executors:
- `local` - Run on your local machine
- `container` - Run inside the component's Docker container (default for component tasks)

## Interactive Tasks

For tasks that need user input (like `sudo`), mark them as interactive:

```yaml
tasks:
  sudo:
    interactive: true
    executors:
      - local
    script: |
      sudo ls -la
```

## Confirmation

Require user confirmation before running:

```yaml
tasks:
  confirm:
    vars:
      NAME: ${env:NAME:-world}
    confirm:
      message: "Are you sure?"
      expect: ${NAME}
    script: |
      echo "Confirmed! Hello ${NAME}"
```

The user must type the expected value to proceed.

## Project vs Component Tasks

**Project tasks** are defined at the root level and run in the project context:

```yaml
# .emb.yml
tasks:
  greet:
    script: echo "Hello from project"
```

**Component tasks** are defined within a component and can run in that component's container:

```yaml
# api/.emb.yml
tasks:
  test:
    script: npm run test
```

Component tasks are prefixed with the component name: `api:test`.
