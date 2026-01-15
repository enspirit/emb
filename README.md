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
@enspirit/emb/0.15.0 darwin-arm64 node-v22.21.1
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
* [`emb components logs COMPONENT`](#emb-components-logs-component)
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
* [`emb logs COMPONENT`](#emb-logs-component)
* [`emb ps`](#emb-ps)
* [`emb resources`](#emb-resources)
* [`emb resources build [COMPONENT]`](#emb-resources-build-component)
* [`emb restart [COMPONENT]`](#emb-restart-component)
* [`emb run TASK`](#emb-run-task)
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
  $ emb clean [--json] [--verbose] [-f]

FLAGS
  -f, --force         Force the deletion of containers & images
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Clean the project.

EXAMPLES
  $ emb clean
```

## `emb components`

List components.

```
USAGE
  $ emb components [--json] [--verbose] [--flavor <value>]

FLAGS
  --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List components.

EXAMPLES
  $ emb components
```

## `emb components logs COMPONENT`

Get components logs.

```
USAGE
  $ emb components logs COMPONENT [--verbose] [-f]

ARGUMENTS
  COMPONENT  The component you want to see the logs of

FLAGS
  -f, --[no-]follow   Follow log output
  --[no-]verbose

DESCRIPTION
  Get components logs.

ALIASES
  $ emb logs

EXAMPLES
  $ emb components logs
```

## `emb components shell COMPONENT`

Get a shell on a running component.

```
USAGE
  $ emb components shell COMPONENT [--verbose] [-s <value>]

ARGUMENTS
  COMPONENT  The component you want to get a shell on

FLAGS
  -s, --shell=<value>  [default: bash] The shell to run
  --[no-]verbose

DESCRIPTION
  Get a shell on a running component.

ALIASES
  $ emb shell

EXAMPLES
  $ emb components shell
```

## `emb config print`

Print the current config.

```
USAGE
  $ emb config print [--json] [--verbose] [--flavor <value>]

FLAGS
  --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Print the current config.

EXAMPLES
  $ emb config print
```

## `emb containers`

List docker containers.

```
USAGE
  $ emb containers [--json] [--verbose] [-a]

FLAGS
  -a, --all           Retun all containers. By default, only running containers are shown
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List docker containers.

EXAMPLES
  $ emb containers
```

## `emb containers prune`

Prune containers.

```
USAGE
  $ emb containers prune [--json] [--verbose]

FLAGS
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Prune containers.

EXAMPLES
  $ emb containers prune
```

## `emb down`

Stop the whole project.

```
USAGE
  $ emb down [--json] [--verbose] [--flavor <value>]

FLAGS
  --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Stop the whole project.

EXAMPLES
  $ emb down
```

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
  $ emb images [--json] [--verbose] [--flavor <value>] [-a]

FLAGS
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

## `emb images delete`

Delete project images.

```
USAGE
  $ emb images delete [--json] [--verbose] [-f]

FLAGS
  -f, --force         Remove the image even if it is being used by stopped containers or has other tags
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Delete project images.

EXAMPLES
  $ emb images delete
```

## `emb images prune`

Prune project images.

```
USAGE
  $ emb images prune [--json] [--verbose] [-a]

FLAGS
  -a, --all           Prune all images. When set to true all images will be pruned, not only dangling ones
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Prune project images.

EXAMPLES
  $ emb images prune
```

## `emb images push`

Push docker images.

```
USAGE
  $ emb images push [--json] [--verbose] [--flavor <value>] [--registry <value>] [--retag <value>]

FLAGS
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

## `emb kubernetes logs COMPONENT`

Follow kubernetes logs.

```
USAGE
  $ emb kubernetes logs COMPONENT -n <value> [--verbose] [-f]

ARGUMENTS
  COMPONENT  The component you want to see the logs of

FLAGS
  -f, --[no-]follow        Follow log output
  -n, --namespace=<value>  (required) [env: K8S_NAMESPACE] The Kubernetes namespace to target
  --[no-]verbose

DESCRIPTION
  Follow kubernetes logs.

ALIASES
  $ emb logs

EXAMPLES
  $ emb kubernetes logs
```

## `emb kubernetes ps`

Show running pods.

```
USAGE
  $ emb kubernetes ps -n <value> [--verbose] [--watch]

FLAGS
  -n, --namespace=<value>  (required) [env: K8S_NAMESPACE] The Kubernetes namespace to target
  --[no-]verbose
  --[no-]watch

DESCRIPTION
  Show running pods.

EXAMPLES
  $ emb kubernetes ps
```

## `emb kubernetes restart [DEPLOYMENT]`

Restart pods of an instance.

```
USAGE
  $ emb kubernetes restart [DEPLOYMENT...] -n <value> [--verbose]

ARGUMENTS
  [DEPLOYMENT...]  The deployment(s) to restart

FLAGS
  -n, --namespace=<value>  (required) [env: K8S_NAMESPACE] The Kubernetes namespace to target
  --[no-]verbose

DESCRIPTION
  Restart pods of an instance.

EXAMPLES
  $ emb kubernetes restart
```

## `emb kubernetes shell COMPONENT`

Get a shell on a deployed component.

```
USAGE
  $ emb kubernetes shell COMPONENT -n <value> [--verbose] [-s <value>]

ARGUMENTS
  COMPONENT  The component you want to get a shell on

FLAGS
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

## `emb logs COMPONENT`

Get components logs.

```
USAGE
  $ emb logs COMPONENT [--verbose] [-f]

ARGUMENTS
  COMPONENT  The component you want to see the logs of

FLAGS
  -f, --[no-]follow   Follow log output
  --[no-]verbose

DESCRIPTION
  Get components logs.

ALIASES
  $ emb logs

EXAMPLES
  $ emb logs
```

## `emb ps`

Lists the containers running in the project.

```
USAGE
  $ emb ps [--verbose] [--flavor <value>] [-a]

FLAGS
  -a, --all             Show all stopped containers
      --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

DESCRIPTION
  Lists the containers running in the project.

EXAMPLES
  $ emb ps
```

## `emb resources`

List resources.

```
USAGE
  $ emb resources [--json] [--verbose] [--flavor <value>]

FLAGS
  --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List resources.

EXAMPLES
  $ emb resources
```

## `emb resources build [COMPONENT]`

Build the resources of the monorepo

```
USAGE
  $ emb resources build [COMPONENT...] [--json] [--verbose] [--flavor <value>] [--dry-run] [-f]

ARGUMENTS
  [COMPONENT...]  List of resources to build (defaults to all)

FLAGS
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

## `emb restart [COMPONENT]`

Restart the whole project.

```
USAGE
  $ emb restart [COMPONENT...] [--json] [--verbose] [-f]

ARGUMENTS
  [COMPONENT...]  The component(s) to restart

FLAGS
  -f, --no-deps       Don't restart depdendent components
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Restart the whole project.

EXAMPLES
  $ emb restart
```

## `emb run TASK`

Run tasks.

```
USAGE
  $ emb run TASK... [--json] [--verbose] [-x container|local] [-a]

ARGUMENTS
  TASK...  List of tasks to run. You can provide either ids or names (eg: component:task or task)

FLAGS
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

## `emb shell COMPONENT`

Get a shell on a running component.

```
USAGE
  $ emb shell COMPONENT [--verbose] [-s <value>]

ARGUMENTS
  COMPONENT  The component you want to get a shell on

FLAGS
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
  $ emb start [COMPONENT...] [--json] [--verbose]

ARGUMENTS
  [COMPONENT...]  The component(s) to start

FLAGS
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Starts the whole project.

EXAMPLES
  $ emb start
```

## `emb stop`

Stop the whole project.

```
USAGE
  $ emb stop [--json] [--verbose] [--flavor <value>]

FLAGS
  --flavor=<value>  Specify the flavor to use.
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Stop the whole project.

EXAMPLES
  $ emb stop
```

## `emb tasks`

List tasks.

```
USAGE
  $ emb tasks [--json] [--verbose]

FLAGS
  --[no-]verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List tasks.

EXAMPLES
  $ emb tasks
```

## `emb tasks run TASK`

Run tasks.

```
USAGE
  $ emb tasks run TASK... [--json] [--verbose] [-x container|local] [-a]

ARGUMENTS
  TASK...  List of tasks to run. You can provide either ids or names (eg: component:task or task)

FLAGS
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

## `emb up [COMPONENT]`

Start the whole project.

```
USAGE
  $ emb up [COMPONENT...] [--json] [--verbose] [--flavor <value>] [-f]

ARGUMENTS
  [COMPONENT...]  The component(s) to build and start

FLAGS
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
