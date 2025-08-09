emb (Enspirit's Monorepo Builder)
=================

A CLI to help on Enspirit monorepos. This aims at replacing our aging [Makefile for monorepos](https://github.com/enspirit/makefile-for-monorepos/pulls)

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
@enspirit/emb/0.0.3 darwin-x64 node-v22.12.0
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
* [`emb components build [COMPONENT]`](#emb-components-build-component)
* [`emb config print`](#emb-config-print)
* [`emb containers`](#emb-containers)
* [`emb containers prune`](#emb-containers-prune)
* [`emb down`](#emb-down)
* [`emb help [COMMAND]`](#emb-help-command)
* [`emb images`](#emb-images)
* [`emb images delete`](#emb-images-delete)
* [`emb images prune`](#emb-images-prune)
* [`emb ps`](#emb-ps)
* [`emb run COMPONENT SCRIPT`](#emb-run-component-script)
* [`emb tasks`](#emb-tasks)
* [`emb tasks run [TASK]`](#emb-tasks-run-task)
* [`emb up`](#emb-up)

## `emb autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ emb autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  (zsh|bash|powershell) Shell type

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

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.2.34/src/commands/autocomplete/index.ts)_

## `emb clean`

Clean the project.

```
USAGE
  $ emb clean [--json]

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
  $ emb components [--json] [--flavor <value>]

FLAGS
  --flavor=<value>  Specify the flavor to use.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List components.

EXAMPLES
  $ emb components
```

## `emb components build [COMPONENT]`

Build the components of the monorepo

```
USAGE
  $ emb components build [COMPONENT...] [--json] [--flavor <value>]

ARGUMENTS
  COMPONENT...  List of components to build

FLAGS
  --flavor=<value>  Specify the flavor to use.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Build the components of the monorepo

EXAMPLES
  $ emb components build build --flavor development
```

## `emb config print`

Print the current config.

```
USAGE
  $ emb config print [--json] [--flavor <value>]

FLAGS
  --flavor=<value>  Specify the flavor to use.

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
  $ emb containers [--json] [-a]

FLAGS
  -a, --all  Retun all containers. By default, only running containers are shown

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List docker containers.

ALIASES
  $ emb ps

EXAMPLES
  $ emb containers
```

## `emb containers prune`

Prune containers.

```
USAGE
  $ emb containers prune [--json]

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
  $ emb down [--json]

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
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for emb.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.32/src/commands/help.ts)_

## `emb images`

List docker images.

```
USAGE
  $ emb images [--json] [-a]

FLAGS
  -a, --all  Show all images. Only images from a final layer (no children) are shown by default.

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
  $ emb images delete [--json] [-f]

FLAGS
  -f, --force  Remove the image even if it is being used by stopped containers or has other tags

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
  $ emb images prune [--json] [-a]

FLAGS
  -a, --all  Prune all images. When set to true all images will be pruned, not only dangling ones

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Prune project images.

EXAMPLES
  $ emb images prune
```

## `emb ps`

List docker containers.

```
USAGE
  $ emb ps [--json] [-a]

FLAGS
  -a, --all  Retun all containers. By default, only running containers are shown

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List docker containers.

ALIASES
  $ emb ps

EXAMPLES
  $ emb ps
```

## `emb run COMPONENT SCRIPT`

Run an npm script from a component's package.json

```
USAGE
  $ emb run COMPONENT SCRIPT

ARGUMENTS
  COMPONENT  Component name
  SCRIPT     NPM script to run

DESCRIPTION
  Run an npm script from a component's package.json
```

## `emb tasks`

List tasks.

```
USAGE
  $ emb tasks [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List tasks.

EXAMPLES
  $ emb tasks
```

## `emb tasks run [TASK]`

Run a task.

```
USAGE
  $ emb tasks run [TASK...] [--json] [-x container|local]

ARGUMENTS
  TASK...  List of tasks ids to run (eg: component:task)

FLAGS
  -x, --executor=<option>  <options: container|local>

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Run a task.

EXAMPLES
  $ emb tasks run
```

## `emb up`

Start the whole project.

```
USAGE
  $ emb up [--json] [--flavor <value>] [-f]

FLAGS
  -f, --force-recreate  Recreate containers even if their configuration and image haven't changed
      --flavor=<value>  Specify the flavor to use.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Start the whole project.

EXAMPLES
  $ emb up
```
<!-- commandsstop -->
