emb (Enspirit's Monorepo Builder)
=================

A CLI to help on Enspirit monorepos. This aims at replacing our aging [Makefile for monorepos](https://github.com/enspirit/makefile-for-monorepos)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @enspirit/emb
$ emb COMMAND
running command...
$ emb (--version)
@enspirit/emb/0.20.0 darwin-x64 node-v22.18.0
$ emb --help [COMMAND]
USAGE
  $ emb COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`emb autocomplete [SHELL]`](#emb-autocomplete-shell)
* [`emb clean`](#emb-clean)
* [`emb components`](#emb-components)
* [`emb components logs [COMPONENT]`](#emb-components-logs-component)
* [`emb components shell COMPONENT`](#emb-components-shell-component)
* [`emb config print`](#emb-config-print)
* [`emb containers`](#emb-containers)
* [`emb containers prune`](#emb-containers-prune)
* [`emb down`](#emb-down)
* [`emb help [COMMAND]`](#emb-help-command)
* [`emb images`](#emb-images)
* [`emb images delete`](#emb-images-delete)
* [`emb images prune`](#emb-images-prune)
* [`emb images push`](#emb-images-push)
* [`emb kubernetes logs COMPONENT`](#emb-kubernetes-logs-component)
* [`emb kubernetes ps`](#emb-kubernetes-ps)
* [`emb kubernetes restart [DEPLOYMENT]`](#emb-kubernetes-restart-deployment)
* [`emb kubernetes shell COMPONENT`](#emb-kubernetes-shell-component)
* [`emb logs [COMPONENT]`](#emb-logs-component)
* [`emb logs archive [COMPONENT]`](#emb-logs-archive-component)
* [`emb ps`](#emb-ps)
* [`emb resources`](#emb-resources)
* [`emb resources build [COMPONENT]`](#emb-resources-build-component)
* [`emb restart [COMPONENT]`](#emb-restart-component)
* [`emb run TASK`](#emb-run-task)
* [`emb secrets`](#emb-secrets)
* [`emb secrets providers`](#emb-secrets-providers)
* [`emb secrets validate`](#emb-secrets-validate)
* [`emb shell COMPONENT`](#emb-shell-component)
* [`emb start [COMPONENT]`](#emb-start-component)
* [`emb stop`](#emb-stop)
* [`emb tasks`](#emb-tasks)
* [`emb tasks run TASK`](#emb-tasks-run-task)
* [`emb up [COMPONENT]`](#emb-up-component)
* [`emb update [CHANNEL]`](#emb-update-channel)

## `emb autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ emb autocomplete [SHELL] [-r]

ARGUMENTS
  [SHELL]  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  Display autocomplete installation instructions.

EXAMPLES
  $ emb autocomplete

  $ emb autocomplete bash

  $ emb autocomplete zsh

  $ emb autocomplete powershell

  $ emb autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.2.39/src/commands/autocomplete/index.ts)_

## `emb clean`

Clean the project.

```
USAGE
  $ emb clean [--json] [--verbose] [-C <value>] [-f]

FLAGS
  -C, --root=<value>  Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -f, --force         Force the deletion of containers & images
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Clean the project.

EXAMPLES
  $ emb clean
```

_See code: [src/commands/clean.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/clean.ts)_

## `emb components`

List components.

```
USAGE
  $ emb components [--json] [--verbose] [-C <value>] [--flavor <value>]

FLAGS
  -C, --root=<value>    Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
      --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List components.

EXAMPLES
  $ emb components
```

_See code: [src/commands/components/index.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/components/index.ts)_

## `emb components logs [COMPONENT]`

Get components logs.

```
USAGE
  $ emb components logs [COMPONENT...] [--verbose] [-C <value>] [-f]

ARGUMENTS
  [COMPONENT...]  The component(s) you want to see the logs of (all if omitted)

FLAGS
  -C, --root=<value>  Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -f, --[no-]follow   Follow log output
  --[no-]verbose

DESCRIPTION
  Get components logs.

EXAMPLES
  $ emb components logs

  $ emb components logs backend

  $ emb components logs backend frontend

  $ emb components logs --no-follow backend
```

_See code: [src/commands/components/logs.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/components/logs.ts)_

## `emb components shell COMPONENT`

Get a shell on a running component.

```
USAGE
  $ emb components shell COMPONENT [--verbose] [-C <value>] [-s <value>]

ARGUMENTS
  COMPONENT  The component you want to get a shell on

FLAGS
  -C, --root=<value>   Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -s, --shell=<value>  [default: bash] The shell to run
  --[no-]verbose

DESCRIPTION
  Get a shell on a running component.

ALIASES
  $ emb shell

EXAMPLES
  $ emb components shell
```

_See code: [src/commands/components/shell.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/components/shell.ts)_

## `emb config print`

Print the current config.

```
USAGE
  $ emb config print [--json] [--verbose] [-C <value>] [--flavor <value>]

FLAGS
  -C, --root=<value>    Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
      --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Print the current config.

EXAMPLES
  $ emb config print
```

_See code: [src/commands/config/print.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/config/print.ts)_

## `emb containers`

List docker containers.

```
USAGE
  $ emb containers [--json] [--verbose] [-C <value>] [-a]

FLAGS
  -C, --root=<value>  Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -a, --all           Retun all containers. By default, only running containers are shown
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List docker containers.

EXAMPLES
  $ emb containers
```

_See code: [src/commands/containers/index.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/containers/index.ts)_

## `emb containers prune`

Prune containers.

```
USAGE
  $ emb containers prune [--json] [--verbose] [-C <value>]

FLAGS
  -C, --root=<value>  Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Prune containers.

EXAMPLES
  $ emb containers prune
```

_See code: [src/commands/containers/prune.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/containers/prune.ts)_

## `emb down`

Stop the whole project.

```
USAGE
  $ emb down [--json] [--verbose] [-C <value>] [--flavor <value>]

FLAGS
  -C, --root=<value>    Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
      --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Stop the whole project.

EXAMPLES
  $ emb down
```

_See code: [src/commands/down.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/down.ts)_

## `emb help [COMMAND]`

Display help for emb.

```
USAGE
  $ emb help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for emb.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.36/src/commands/help.ts)_

## `emb images`

List docker images.

```
USAGE
  $ emb images [--json] [--verbose] [-C <value>] [--flavor <value>] [-a]

FLAGS
  -C, --root=<value>    Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -a, --all             Show all images. Only images from a final layer (no children) are shown by default.
      --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List docker images.

EXAMPLES
  $ emb images
```

_See code: [src/commands/images/index.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/images/index.ts)_

## `emb images delete`

Delete project images.

```
USAGE
  $ emb images delete [--json] [--verbose] [-C <value>] [-f]

FLAGS
  -C, --root=<value>  Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -f, --force         Remove the image even if it is being used by stopped containers or has other tags
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Delete project images.

EXAMPLES
  $ emb images delete
```

_See code: [src/commands/images/delete.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/images/delete.ts)_

## `emb images prune`

Prune project images.

```
USAGE
  $ emb images prune [--json] [--verbose] [-C <value>] [-a]

FLAGS
  -C, --root=<value>  Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -a, --all           Prune all images. When set to true all images will be pruned, not only dangling ones
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Prune project images.

EXAMPLES
  $ emb images prune
```

_See code: [src/commands/images/prune.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/images/prune.ts)_

## `emb images push`

Push docker images.

```
USAGE
  $ emb images push [--json] [--verbose] [-C <value>] [--flavor <value>] [--registry <value>] [--retag <value>]

FLAGS
  -C, --root=<value>      Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
      --flavor=<value>    Specify the flavor to use.
      --registry=<value>  Override the registry to push to
      --retag=<value>     Override the original tag to push to a new tag
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Push docker images.

EXAMPLES
  $ emb images push

  $ emb images push --registry my.registry.io --retag newtag
```

_See code: [src/commands/images/push.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/images/push.ts)_

## `emb kubernetes logs COMPONENT`

Follow kubernetes logs.

```
USAGE
  $ emb kubernetes logs COMPONENT -n <value> [--verbose] [-C <value>] [-f]

ARGUMENTS
  COMPONENT  The component you want to see the logs of

FLAGS
  -C, --root=<value>       Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -f, --[no-]follow        Follow log output
  -n, --namespace=<value>  (required) [env: K8S_NAMESPACE] The Kubernetes namespace to target
  --[no-]verbose

DESCRIPTION
  Follow kubernetes logs.

EXAMPLES
  $ emb kubernetes logs
```

_See code: [src/commands/kubernetes/logs.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/kubernetes/logs.ts)_

## `emb kubernetes ps`

Show running pods.

```
USAGE
  $ emb kubernetes ps -n <value> [--verbose] [-C <value>] [--watch]

FLAGS
  -C, --root=<value>       Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -n, --namespace=<value>  (required) [env: K8S_NAMESPACE] The Kubernetes namespace to target
  --[no-]verbose
  --[no-]watch

DESCRIPTION
  Show running pods.

EXAMPLES
  $ emb kubernetes ps
```

_See code: [src/commands/kubernetes/ps.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/kubernetes/ps.ts)_

## `emb kubernetes restart [DEPLOYMENT]`

Restart pods of an instance.

```
USAGE
  $ emb kubernetes restart [DEPLOYMENT...] -n <value> [--verbose] [-C <value>]

ARGUMENTS
  [DEPLOYMENT...]  The deployment(s) to restart

FLAGS
  -C, --root=<value>       Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -n, --namespace=<value>  (required) [env: K8S_NAMESPACE] The Kubernetes namespace to target
  --[no-]verbose

DESCRIPTION
  Restart pods of an instance.

EXAMPLES
  $ emb kubernetes restart
```

_See code: [src/commands/kubernetes/restart.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/kubernetes/restart.ts)_

## `emb kubernetes shell COMPONENT`

Get a shell on a deployed component.

```
USAGE
  $ emb kubernetes shell COMPONENT -n <value> [--verbose] [-C <value>] [-s <value>]

ARGUMENTS
  COMPONENT  The component you want to get a shell on

FLAGS
  -C, --root=<value>       Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -n, --namespace=<value>  (required) [env: K8S_NAMESPACE] The Kubernetes namespace to target
  -s, --shell=<value>      [default: bash] The shell to run
  --[no-]verbose

DESCRIPTION
  Get a shell on a deployed component.

ALIASES
  $ emb shell

EXAMPLES
  $ emb kubernetes shell
```

_See code: [src/commands/kubernetes/shell.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/kubernetes/shell.ts)_

## `emb logs [COMPONENT]`

Get components logs.

```
USAGE
  $ emb logs [COMPONENT...] [--verbose] [-C <value>] [-f]

ARGUMENTS
  [COMPONENT...]  The component(s) you want to see the logs of (all if omitted)

FLAGS
  -C, --root=<value>  Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -f, --[no-]follow   Follow log output
  --[no-]verbose

DESCRIPTION
  Get components logs.

EXAMPLES
  $ emb logs

  $ emb logs backend

  $ emb logs backend frontend

  $ emb logs --no-follow backend
```

_See code: [src/commands/logs/index.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/logs/index.ts)_

## `emb logs archive [COMPONENT]`

Archive docker compose logs to files (one file per component).

```
USAGE
  $ emb logs archive [COMPONENT...] [--json] [--verbose] [-C <value>] [-t] [--tail <value>] [-o <value>]

ARGUMENTS
  [COMPONENT...]  The component(s) to archive logs for (all if omitted)

FLAGS
  -C, --root=<value>    Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -o, --output=<value>  Output directory for log files (defaults to .emb/<flavor>/logs/docker/compose)
  -t, --timestamps      Include timestamps in logs
      --tail=<value>    Number of lines to show from the end of the logs
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Archive docker compose logs to files (one file per component).

EXAMPLES
  $ emb logs archive

  $ emb logs archive backend frontend

  $ emb logs archive --timestamps

  $ emb logs archive --tail 1000
```

_See code: [src/commands/logs/archive.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/logs/archive.ts)_

## `emb ps`

Lists the containers running in the project.

```
USAGE
  $ emb ps [--verbose] [-C <value>] [--flavor <value>] [-a]

FLAGS
  -C, --root=<value>    Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -a, --all             Show all stopped containers
      --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

DESCRIPTION
  Lists the containers running in the project.

EXAMPLES
  $ emb ps
```

_See code: [src/commands/ps.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/ps.ts)_

## `emb resources`

List resources.

```
USAGE
  $ emb resources [--json] [--verbose] [-C <value>] [--flavor <value>]

FLAGS
  -C, --root=<value>    Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
      --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List resources.

EXAMPLES
  $ emb resources
```

_See code: [src/commands/resources/index.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/resources/index.ts)_

## `emb resources build [COMPONENT]`

Build the resources of the monorepo

```
USAGE
  $ emb resources build [COMPONENT...] [--json] [--verbose] [-C <value>] [--flavor <value>] [--dry-run] [-f]

ARGUMENTS
  [COMPONENT...]  List of resources to build (defaults to all)

FLAGS
  -C, --root=<value>    Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -f, --force           Bypass the cache and force the build
      --dry-run         Do not build the resources but only produce build meta information
      --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Build the resources of the monorepo

EXAMPLES
  $ emb resources build build --flavor development
```

_See code: [src/commands/resources/build.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/resources/build.ts)_

## `emb restart [COMPONENT]`

Restart the whole project.

```
USAGE
  $ emb restart [COMPONENT...] [--json] [--verbose] [-C <value>] [-f]

ARGUMENTS
  [COMPONENT...]  The component(s) to restart

FLAGS
  -C, --root=<value>  Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -f, --no-deps       Don't restart depdendent components
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Restart the whole project.

EXAMPLES
  $ emb restart
```

_See code: [src/commands/restart.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/restart.ts)_

## `emb run TASK`

Run tasks.

```
USAGE
  $ emb run TASK... [--json] [--verbose] [-C <value>] [-x container|local] [-a]

ARGUMENTS
  TASK...  List of tasks to run. You can provide either ids or names (eg: component:task or task)

FLAGS
  -C, --root=<value>       Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -a, --all-matching       Run all tasks matching (when multiple matches)
  -x, --executor=<option>  Where to run the task. (experimental!)
                           <options: container|local>
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Run tasks.

ALIASES
  $ emb run

EXAMPLES
  $ emb run
```

## `emb secrets`

List all secret references in the configuration.

```
USAGE
  $ emb secrets [--json] [--verbose] [-C <value>] [--flavor <value>]

FLAGS
  -C, --root=<value>    Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
      --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List all secret references in the configuration.

EXAMPLES
  $ emb secrets

  $ emb secrets --json
```

_See code: [src/commands/secrets/index.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/secrets/index.ts)_

## `emb secrets providers`

Show configured secret providers and their status.

```
USAGE
  $ emb secrets providers [--json] [--verbose] [-C <value>] [--flavor <value>]

FLAGS
  -C, --root=<value>    Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
      --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show configured secret providers and their status.

EXAMPLES
  $ emb secrets providers
```

_See code: [src/commands/secrets/providers.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/secrets/providers.ts)_

## `emb secrets validate`

Validate that all secret references can be resolved (without showing values).

```
USAGE
  $ emb secrets validate [--json] [--verbose] [-C <value>] [--flavor <value>] [--fail-fast]

FLAGS
  -C, --root=<value>    Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
      --fail-fast       Stop on first validation error
      --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Validate that all secret references can be resolved (without showing values).

EXAMPLES
  $ emb secrets validate

  $ emb secrets validate --fail-fast

  $ emb secrets validate --json
```

_See code: [src/commands/secrets/validate.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/secrets/validate.ts)_

## `emb shell COMPONENT`

Get a shell on a running component.

```
USAGE
  $ emb shell COMPONENT [--verbose] [-C <value>] [-s <value>]

ARGUMENTS
  COMPONENT  The component you want to get a shell on

FLAGS
  -C, --root=<value>   Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -s, --shell=<value>  [default: bash] The shell to run
  --[no-]verbose

DESCRIPTION
  Get a shell on a running component.

ALIASES
  $ emb shell

EXAMPLES
  $ emb shell
```

## `emb start [COMPONENT]`

Starts the whole project.

```
USAGE
  $ emb start [COMPONENT...] [--json] [--verbose] [-C <value>]

ARGUMENTS
  [COMPONENT...]  The component(s) to start

FLAGS
  -C, --root=<value>  Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Starts the whole project.

EXAMPLES
  $ emb start
```

_See code: [src/commands/start.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/start.ts)_

## `emb stop`

Stop the whole project.

```
USAGE
  $ emb stop [--json] [--verbose] [-C <value>] [--flavor <value>]

FLAGS
  -C, --root=<value>    Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
      --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Stop the whole project.

EXAMPLES
  $ emb stop
```

_See code: [src/commands/stop.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/stop.ts)_

## `emb tasks`

List tasks.

```
USAGE
  $ emb tasks [--json] [--verbose] [-C <value>]

FLAGS
  -C, --root=<value>  Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List tasks.

EXAMPLES
  $ emb tasks
```

_See code: [src/commands/tasks/index.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/tasks/index.ts)_

## `emb tasks run TASK`

Run tasks.

```
USAGE
  $ emb tasks run TASK... [--json] [--verbose] [-C <value>] [-x container|local] [-a]

ARGUMENTS
  TASK...  List of tasks to run. You can provide either ids or names (eg: component:task or task)

FLAGS
  -C, --root=<value>       Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -a, --all-matching       Run all tasks matching (when multiple matches)
  -x, --executor=<option>  Where to run the task. (experimental!)
                           <options: container|local>
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Run tasks.

ALIASES
  $ emb run

EXAMPLES
  $ emb tasks run
```

_See code: [src/commands/tasks/run.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/tasks/run.ts)_

## `emb up [COMPONENT]`

Start the whole project.

```
USAGE
  $ emb up [COMPONENT...] [--json] [--verbose] [-C <value>] [--flavor <value>] [-f]

ARGUMENTS
  [COMPONENT...]  The component(s) to build and start

FLAGS
  -C, --root=<value>    Run as if emb was started in <path>. Can also be set via EMB_ROOT env var.
  -f, --force           Bypass caches, force the recreation of containers, etc
      --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Start the whole project.

EXAMPLES
  $ emb up
```

_See code: [src/commands/up.ts](https://github.com/enspirit/emb/blob/v0.20.0/src/commands/up.ts)_

## `emb update [CHANNEL]`

update the emb CLI

```
USAGE
  $ emb update [CHANNEL] [--force |  | [-a | -v <value> | -i]] [-b ]

FLAGS
  -a, --available        See available versions.
  -b, --verbose          Show more details about the available versions.
  -i, --interactive      Interactively select version to install. This is ignored if a channel is provided.
  -v, --version=<value>  Install a specific version.
      --force            Force a re-download of the requested version.

DESCRIPTION
  update the emb CLI

EXAMPLES
  Update to the stable channel:

    $ emb update stable

  Update to a specific version:

    $ emb update --version 1.0.0

  Interactively select version:

    $ emb update --interactive

  See available versions:

    $ emb update --available
```

_See code: [@oclif/plugin-update](https://github.com/oclif/plugin-update/blob/v4.7.16/src/commands/update.ts)_
<!-- commandsstop -->
