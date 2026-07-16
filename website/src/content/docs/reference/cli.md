---
title: CLI Reference
description: Complete reference for EMB commands
---

Complete reference for all EMB commands.

## Global Options

These options are available on every command:

| Option | Env Var | Description |
|--------|---------|-------------|
| `-C, --root <path>` | `EMB_ROOT` | Run as if emb was started in `<path>` |
| `--verbose` / `--no-verbose` | `EMB_VERBOSE` | Enable verbose output |
| `--help` | — | Show help for command |

Two more options are widely available but **not** universal. Passing one to a
command that doesn't accept it fails with `Nonexistent flag`, so their scope is
listed below. `emb <command> --help` is always authoritative.

### --flavor

`--flavor <name>` (env var: `EMB_FLAVOR`) selects a [flavor](/emb/advanced/flavors/).
It is accepted by:

`up`, `down`, `start`, `stop`, `restart`, `ps`, `components`, `config print`,
`images`, `images push`, `resources`, `resources build`, `resources publish`,
`secrets`, `secrets providers`, `secrets validate`

It is **not** accepted by `clean`, `components shell`, `containers`,
`containers prune`, `images delete`, `images prune`, `logs`, `logs archive`,
`tasks`, `tasks run`, or any `kubernetes` command.

**`emb run` does not support flavors.** `emb run` is an alias of `emb tasks run`,
which has no `--flavor` flag — and because the flag doesn't exist there, `EMB_FLAVOR`
is ignored too, *silently*. `EMB_FLAVOR=production emb run api:test` runs the task
against the base configuration and prints no warning.

### --json

`--json` formats output as JSON. It is available on every command except:

`ps`, `logs`, `components shell`, `kubernetes ps`, `kubernetes restart`,
`kubernetes logs`, `kubernetes shell`

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

An environment variable only reaches commands that declare the matching flag.
`EMB_ROOT` and `EMB_VERBOSE` are honored everywhere, but `EMB_FLAVOR` is read only
by the commands listed under [`--flavor`](#flavor) above — notably **not** by
`emb run`. Exporting `EMB_FLAVOR` in CI does not flavor your task runs.

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
- `-f, --force` - Bypass build caches (force-rebuild all resources) **and** force recreation of containers
- `-j, --jobs <n|auto>` - Build up to `n` resources in parallel, or `auto` for min(CPU count, 4). Defaults to serial (1).
- `-k, --keep-going` - After a failure, keep building resources that don't depend on the failed one. Off by default (fail-fast).
- `--flavor <name>` - Use a specific flavor

`emb up` builds any required resources before starting the services. `--jobs` and
`--keep-going` apply to that build phase only — they do not affect how the
services themselves are started. See
[Parallel builds](#parallel-builds) for details.

`-f` also applies to both phases, so `emb up -f` is a full no-cache rebuild of
every resource — not just a `docker compose --force-recreate`. Reach for it only
when you mean it.

**Examples:**
```shell
emb up                      # Start all services
emb up api web              # Start specific services
emb up --flavor production  # Start with production config
emb up -f                   # Force rebuild resources and recreate containers
emb up -j auto              # Build resources in parallel, then start
```

### emb down

Stop and remove the project's containers (defaults to all).

```shell
emb down [SERVICE...]
```

**Arguments:**
- `SERVICE...` - Optional services to stop and remove (defaults to all)

### emb start

Start existing (already created) project containers without recreating them.

```shell
emb start [SERVICE...]
```

**Arguments:**
- `SERVICE...` - Optional services to start (defaults to all)

### emb stop

Stop project containers without removing them (contrast with `emb down`, which removes them).

```shell
emb stop [SERVICE...]
```

**Arguments:**
- `SERVICE...` - Optional services to stop (defaults to all)

### emb restart

Restart project services.

```shell
emb restart [SERVICE...] [OPTIONS]
```

**Arguments:**
- `SERVICE...` - Optional services to restart (defaults to all)

**Options:**
- `-f, --no-deps` - Don't restart dependent services (note: the short form is `-f`, and it does **not** mean "force" as it does on `emb up`)

### emb ps

List running containers.

```shell
emb ps [OPTIONS]
```

**Options:**
- `-a, --all` - Show all stopped containers

`emb ps` does not support `--json`.

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

### emb logs archive

Archive docker compose logs to files (one file per service).

```shell
emb logs archive [SERVICE...] [OPTIONS]
```

**Arguments:**
- `SERVICE...` - Optional services to archive logs for (defaults to all)

**Options:**
- `-t, --timestamps` - Include timestamps in logs (default: false)
- `--tail <n>` - Number of lines to show from the end of the logs
- `-o, --output <dir>` - Output directory for log files (defaults to `.emb/<flavor>/logs/docker/compose`)

**Examples:**
```shell
emb logs archive                  # Archive logs for all services
emb logs archive api web          # Archive logs for specific services
emb logs archive --timestamps     # Include timestamps
emb logs archive --tail 1000      # Only the last 1000 lines per service
```

### emb shell

Get a shell in a running container.

```shell
emb shell <SERVICE> [OPTIONS]
```

**Arguments:**
- `SERVICE` - The service to get a shell on (required)

**Options:**
- `-s, --shell <shell>` - The shell to run (default: `bash`)

**Examples:**
```shell
emb shell api          # bash shell in the api container
emb shell api -s sh    # for images without bash (e.g. alpine)
```

### emb clean

Tear the project down and remove its containers, images and EMB store (logs/sentinels).
Runs `down`, `containers prune`, `images delete` and `images prune` in sequence.

```shell
emb clean [OPTIONS]
```

**Options:**
- `-f, --force` - Force the deletion of containers & images (also prunes all project images, not just dangling ones)

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
- `-j, --jobs <n|auto>` - Build up to `n` resources in parallel, or `auto` for min(CPU count, 4). Defaults to serial (1). Overrides `defaults.build.concurrency`.
- `-k, --keep-going` - After a failure, keep building resources that don't depend on the failed one. Off by default (fail-fast).
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
emb resources build -j 4                # Build up to 4 resources in parallel
emb resources build --jobs auto         # Parallelism = min(CPU count, 4)
emb resources build -j auto -k          # Parallel, don't stop at the first failure
```

#### Parallel builds

By default EMB builds resources one at a time. Pass `-j`/`--jobs` to build several
at once, or set [`defaults.build.concurrency`](/emb/reference/configuration/#defaults)
in `.emb.yml` to make it the default for your project. The flag wins over the config.

Dependency order is always respected, whatever the concurrency: a resource starts
only once **all** of its dependencies have finished successfully, so only
independent resources ever run at the same time. Raising `--jobs` can therefore
speed up a wide dependency graph a lot and a deep, narrow one not at all. Resources
still waiting on a dependency show `Waiting for <deps>` while they queue.

`auto` resolves to min(CPU count, 4). The cap is deliberately conservative because
builds are usually IO- and daemon-bound rather than CPU-bound — Docker already
parallelises work internally, so a high `--jobs` can oversubscribe the daemon and
end up slower.

#### When a build fails

By default builds are **fail-fast**: on the first failure EMB stops starting new
resources, lets the ones already running finish, and skips the rest. With
`-k`/`--keep-going` it instead keeps building everything that doesn't depend on the
failure; only the failed resource's dependents are skipped, since building them
against a missing dependency would be meaningless.

Either way the command exits non-zero and ends with a `BUILD_FAILED` summary
naming every resource that failed and every dependent that was skipped:

```
Failed to build: api:image. Skipped dependent(s): api:bundle. (<the first error>)
```

Each failing resource's own output is shown above the summary.

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
emb components
```

Takes no options beyond the global ones. The container columns (`NAME`, `ID`,
`CREATED`, `STATUS`) are filled in from the component's running container, if any,
and are blank for components that aren't currently up. `NAME` is the *container*
name as reported by Docker, so it carries a leading `/`; the component name is in
the `COMPONENT` column.

**Example output:**
```
  COMPONENT   NAME            ID             CREATED       STATUS
  api         /myapp-api-1    fe0648593184   2 hours ago   Up 2 hours
  web         /myapp-web-1    8c7d6e5f4a3b   2 hours ago   Up 2 hours
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

**Options:**
- `-a, --all` - Show all images. Only images from a final layer (no children) are shown by default.

### emb containers

List Docker containers for the project.

```shell
emb containers [OPTIONS]
```

**Options:**
- `-a, --all` - Return all containers. By default, only running containers are shown.

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
emb components shell    # Get shell in service (alias: emb shell)
```

### logs

```shell
emb logs                # View service logs
emb logs archive        # Archive service logs to files
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
emb tasks run           # Run tasks (alias: emb run)
```

### images

```shell
emb images              # List images
emb images delete       # Delete images
emb images prune        # Prune unused images
emb images push         # [DEPRECATED] Push images — use `emb resources publish` instead
```

### containers

```shell
emb containers          # List containers
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
emb kubernetes shell <COMPONENT>        # Open shell in pod
emb kubernetes logs <COMPONENT>         # View pod logs
emb kubernetes ps                       # List all pods in the namespace
emb kubernetes restart [DEPLOYMENT...]  # Restart deployments (all in the namespace if omitted)
```

`emb kubernetes ps` is namespace-scoped, not component-scoped: it lists every pod
in the target namespace, and any argument you pass it is ignored.

`emb kubernetes restart` takes Kubernetes **deployment** names as they exist in the
cluster — not EMB component names. Omit the argument and it restarts *every*
deployment in the target namespace.

**Common options:**
- `-n, --namespace <name>` - Target namespace

See [Kubernetes Integration](/emb/advanced/kubernetes/) for detailed usage.

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error (build/task failure, unresolvable reference, unknown command, …) |
| 2 | Invalid invocation — unknown flag, bad flag value, or a missing required argument |

An unknown command exits **1**, not 2: `emb foo` falls through to `emb tasks run`,
which reports ``Unknown reference `foo` `` with the code `UNKNOWN_REF`.
