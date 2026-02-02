---
title: CLI Reference
description: Complete reference for EMB commands
---

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
emb up [SERVICE...] [OPTIONS]
```

**Arguments:**
- `SERVICE...` - Optional services to start (defaults to all)

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
emb restart [SERVICE...]
```

### emb ps

List running containers.

```shell
emb ps
```

### emb logs

View container logs.

```shell
emb logs [SERVICE...] [OPTIONS]
```

**Arguments:**
- `SERVICE...` - Optional services to show logs for (defaults to all)

**Options:**
- `-f, --follow / --no-follow` - Follow log output (default: true)

**Examples:**
```shell
emb logs                  # Follow logs for all containers
emb logs api              # Follow API logs
emb logs api web          # Follow logs for multiple services
emb logs --no-follow api  # Get log snapshot without following
```

### emb shell

Get a shell in a running container.

```shell
emb shell <SERVICE>
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
- `--publishable` - Only build resources marked as publishable (and their dependencies)
- `--flavor <name>` - Use a specific flavor

**Examples:**
```shell
emb resources build                     # Build all
emb resources build api:image           # Build specific resource
emb resources build -f                  # Force rebuild all
emb resources build --flavor production # Build for production
emb resources build --publishable       # Build only publishable resources
```

### emb resources publish

Publish resources to their registries (e.g., push Docker images).

```shell
emb resources publish [RESOURCE...] [OPTIONS]
```

**Arguments:**
- `RESOURCE...` - Optional resources to publish (defaults to all publishable)

**Options:**
- `--dry-run` - Show what would be published without publishing
- `--flavor <name>` - Use a specific flavor

Only resources with `publish: true` in their configuration are published. The registry and tag can be configured via `defaults.docker.publish` or per-resource `params.publish`.

**Examples:**
```shell
emb resources publish                     # Publish all publishable resources
emb resources publish api:image           # Publish specific resource
emb resources publish --dry-run           # Preview without pushing
emb resources publish --flavor production # Publish with production config
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

**Options:**
- `--publishable` - Only show resources marked as publishable

**Example output:**
```
  ID          NAME    TYPE           PUBLISHABLE   REFERENCE
  api:image   image   docker/image   ✓             myapp/api:latest
  web:image   image   docker/image   ✓             myapp/web:latest
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
- `-x, --executor <type>` - Force executor: `local`, `container`, or `kubernetes`
- `-a, --all-matching` - Run all tasks matching name

**Examples:**
```shell
emb run test                    # Run task by name
emb run api:test                # Run specific component task
emb run test --all-matching     # Run all 'test' tasks
emb run deploy -x local         # Force local execution
emb run migrate -x kubernetes   # Run on Kubernetes pod
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
emb components logs     # View service logs (alias: emb logs)
emb components shell    # Get shell in service (alias: emb shell)
```

### resources

```shell
emb resources           # List resources
emb resources build     # Build resources
emb resources publish   # Publish resources to registries
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

### secrets

```shell
emb secrets             # List secret references in configuration
emb secrets validate    # Validate that secrets can be resolved
emb secrets providers   # Show configured secret providers
```

### kubernetes

```shell
emb kubernetes shell <COMPONENT>    # Open shell in pod
emb kubernetes logs <COMPONENT>     # View pod logs
emb kubernetes ps <COMPONENT>       # List pods
emb kubernetes restart <COMPONENT>  # Restart pods
```

**Common options:**
- `-n, --namespace <name>` - Target namespace

See [Kubernetes Integration](/emb/advanced/kubernetes/) for detailed usage.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Command not found |
