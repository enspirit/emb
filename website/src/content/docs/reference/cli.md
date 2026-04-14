---
title: CLI Reference
description: Complete reference for EMB commands
---

Complete reference for all EMB commands.

## Global Options

These options are available for all commands:

| Option | Env Var | Description |
|--------|---------|-------------|
| `-C, --root <path>` | `EMB_ROOT` | Run as if emb was started in `<path>` |
| `--verbose` / `--no-verbose` | `EMB_VERBOSE` | Enable verbose output |
| `--flavor <name>` | `EMB_FLAVOR` | Use a specific flavor configuration |
| `--json` | — | Format output as JSON |
| `--help` | — | Show help for command |

## Environment Variables

Any flag with an env-var fallback is resolved in the following order (first non-empty value wins):

1. The CLI flag, if provided
2. The environment variable
3. The command's built-in default

This lets you set defaults in your shell (or CI pipeline) and still override them on individual invocations:

```shell
export EMB_FLAVOR=production
export EMB_VERBOSE=1

emb resources build                     # uses the production flavor, verbose
emb resources build --flavor staging    # flag overrides EMB_FLAVOR
emb resources build --no-verbose        # flag overrides EMB_VERBOSE
```

For Kubernetes commands, the namespace also honors the `K8S_NAMESPACE` environment variable — see [Kubernetes Integration](/emb/advanced/kubernetes/#namespace-resolution).

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

EMB discovers secret references (`${vault:...}`, `${op:...}`) across `.emb.yml` and all component Embfiles.

```shell
emb secrets             # List secret references in configuration
emb secrets validate    # Validate that secrets can be resolved
emb secrets providers   # Show configured secret providers
```

**Common flags:**
- `--flavor <name>` - Evaluate against a specific flavor
- `--json` - Machine-readable output

#### `emb secrets`

Lists every secret reference found in the config (aggregated by provider + path + key), along with usage count and the component(s) that reference it. Values are never fetched or displayed.

```output
 PROVIDER  PATH                       KEY        COMPONENT  USAGECOUNT
 vault     secret/myapp/database      url        api        2
 op        Production/db-credentials  password   api        1
```

#### `emb secrets validate`

Attempts to resolve each reference against its provider and reports pass/fail per secret, without printing values. Useful in CI to catch missing or renamed secrets before deploy.

Additional flag:
- `--fail-fast` - Stop on the first validation error

#### `emb secrets providers`

Shows configured secret providers and their connection status (e.g. `vault`, `op`). Handy for diagnosing auth/connectivity issues before running `validate`.

See [Secrets Management](/emb/advanced/secrets/) for provider configuration, authentication methods (including OIDC with cached tokens), and reference syntax.

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
