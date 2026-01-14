---
title: CLI Reference
description: Complete reference for EMB commands
---

# CLI Reference

Complete reference for all EMB commands.

## Global Options

These options are available for all commands:

| Option | Description |
|--------|-------------|
| `--json` | Format output as JSON |
| `--verbose` / `--no-verbose` | Enable verbose output |
| `--flavor <name>` | Use a specific flavor configuration |
| `--help` | Show help for command |

## Core Commands

### emb up

Start the project services.

```shell
emb up [COMPONENT...] [OPTIONS]
```

**Arguments:**
- `COMPONENT...` - Optional components to start (defaults to all)

**Options:**
- `-f, --force` - Force recreation of containers
- `--flavor <name>` - Use a specific flavor

**Examples:**
```shell
emb up                      # Start all services
emb up api web              # Start specific services
emb up --flavor production  # Start with production config
emb up -f                   # Force recreate containers
```

### emb down

Stop all project services.

```shell
emb down
```

### emb restart

Restart project services.

```shell
emb restart [COMPONENT...]
```

### emb ps

List running containers.

```shell
emb ps
```

### emb logs

View container logs.

```shell
emb logs <COMPONENT...> [OPTIONS]
```

**Options:**
- `--no-follow` - Don't follow log output (logs are followed by default)

**Examples:**
```shell
emb logs api              # Follow API logs
emb logs api web          # Follow logs for multiple services
emb logs --no-follow api  # Get log snapshot without following
```

### emb shell

Get a shell in a running container.

```shell
emb shell <COMPONENT>
```

### emb clean

Clean project build artifacts and caches.

```shell
emb clean
```

## Build Commands

### emb resources build

Build project resources (images, files).

```shell
emb resources build [RESOURCE...] [OPTIONS]
```

**Arguments:**
- `RESOURCE...` - Optional resources to build (defaults to all)

**Options:**
- `-f, --force` - Force rebuild, bypass cache
- `--dry-run` - Show what would be built without building
- `--flavor <name>` - Use a specific flavor

**Examples:**
```shell
emb resources build                     # Build all
emb resources build api:image           # Build specific resource
emb resources build -f                  # Force rebuild all
emb resources build --flavor production # Build for production
```

## List Commands

### emb components

List discovered components.

```shell
emb components [OPTIONS]
```

**Example output:**
```
  NAME         IMAGE_NAME       TAG      CONTAINER
  api          myapp/api        latest
  web          myapp/web        latest
```

### emb resources

List all resources.

```shell
emb resources [OPTIONS]
```

### emb tasks

List available tasks.

```shell
emb tasks [OPTIONS]
```

**Example output:**
```
  NAME    COMPONENT   DESCRIPTION          ID
  test    api         Run API tests        api:test
  build   web         Build frontend       web:build
```

### emb images

List Docker images for the project.

```shell
emb images [OPTIONS]
```

### emb containers

List Docker containers for the project.

```shell
emb containers [OPTIONS]
```

## Task Commands

### emb run

Run one or more tasks.

```shell
emb run <TASK...> [OPTIONS]
```

**Arguments:**
- `TASK...` - Task IDs or names to run

**Options:**
- `-x, --executor <type>` - Force executor: `container` or `local`
- `-a, --all-matching` - Run all tasks matching name

**Examples:**
```shell
emb run test                    # Run task by name
emb run api:test                # Run specific component task
emb run test --all-matching     # Run all 'test' tasks
emb run deploy -x local         # Force local execution
```

## Configuration Commands

### emb config print

Print the resolved configuration.

```shell
emb config print [OPTIONS]
```

Useful for debugging configuration issues.

**Examples:**
```shell
emb config print                    # Print full config
emb config print --flavor production # Print production config
```

## Utility Commands

### emb autocomplete

Set up shell autocompletion.

```shell
emb autocomplete [SHELL]
```

**Supported shells:** bash, zsh, fish

### emb update

Update EMB to the latest version.

```shell
emb update
```

### emb help

Show help for a command.

```shell
emb help [COMMAND]
```

## Command Topics

Some commands are grouped into topics with subcommands:

### components

```shell
emb components          # List components
emb components logs     # View component logs
emb components shell    # Get shell in component
```

### resources

```shell
emb resources           # List resources
emb resources build     # Build resources
```

### tasks

```shell
emb tasks               # List tasks
```

### images

```shell
emb images              # List images
emb images delete       # Delete images
emb images prune        # Prune unused images
```

### containers

```shell
emb containers          # List containers
emb containers delete   # Delete containers
emb containers prune    # Prune stopped containers
```

### config

```shell
emb config print        # Print configuration
```

### kubernetes

```shell
emb kubernetes          # Kubernetes management commands
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Command not found |
