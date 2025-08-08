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
@enspirit/emb/0.0.1 darwin-x64 node-v22.12.0
$ emb --help [COMMAND]
USAGE
  $ emb COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`emb autocomplete [SHELL]`](#emb-autocomplete-shell)
* [`emb build [COMPONENT]`](#emb-build-component)
* [`emb config print`](#emb-config-print)
* [`emb containers`](#emb-containers)
* [`emb containers prune`](#emb-containers-prune)
* [`emb down`](#emb-down)
* [`emb help [COMMAND]`](#emb-help-command)
* [`emb images`](#emb-images)
* [`emb images delete`](#emb-images-delete)
* [`emb images prune`](#emb-images-prune)
* [`emb plugins`](#emb-plugins)
* [`emb plugins add PLUGIN`](#emb-plugins-add-plugin)
* [`emb plugins:inspect PLUGIN...`](#emb-pluginsinspect-plugin)
* [`emb plugins install PLUGIN`](#emb-plugins-install-plugin)
* [`emb plugins link PATH`](#emb-plugins-link-path)
* [`emb plugins remove [PLUGIN]`](#emb-plugins-remove-plugin)
* [`emb plugins reset`](#emb-plugins-reset)
* [`emb plugins uninstall [PLUGIN]`](#emb-plugins-uninstall-plugin)
* [`emb plugins unlink [PLUGIN]`](#emb-plugins-unlink-plugin)
* [`emb plugins update`](#emb-plugins-update)
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

## `emb build [COMPONENT]`

Build the docker images of the monorepo

```
USAGE
  $ emb build [COMPONENT...] [-c <value>] [--failfast] [-f <value>] [-r <value>]

ARGUMENTS
  COMPONENT...  List of components to build

FLAGS
  -c, --concurrency=<value>  [default: 1] Number of concurrent builds
  -f, --flavor=<value>       flavor to build (dev, production, ...)
  -r, --retry=<value>        [default: 1] Retry on build fail
      --[no-]failfast        Stop on first error

DESCRIPTION
  Build the docker images of the monorepo

EXAMPLES
  $ emb build build --flavor development
```

## `emb config print`

Print the current config.

```
USAGE
  $ emb config print [--json]

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

## `emb plugins`

List installed plugins.

```
USAGE
  $ emb plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ emb plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/index.ts)_

## `emb plugins add PLUGIN`

Installs a plugin into emb.

```
USAGE
  $ emb plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into emb.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the EMB_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the EMB_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ emb plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ emb plugins add myplugin

  Install a plugin from a github url.

    $ emb plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ emb plugins add someuser/someplugin
```

## `emb plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ emb plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ emb plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/inspect.ts)_

## `emb plugins install PLUGIN`

Installs a plugin into emb.

```
USAGE
  $ emb plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into emb.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the EMB_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the EMB_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ emb plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ emb plugins install myplugin

  Install a plugin from a github url.

    $ emb plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ emb plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/install.ts)_

## `emb plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ emb plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ emb plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/link.ts)_

## `emb plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ emb plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ emb plugins unlink
  $ emb plugins remove

EXAMPLES
  $ emb plugins remove myplugin
```

## `emb plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ emb plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/reset.ts)_

## `emb plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ emb plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ emb plugins unlink
  $ emb plugins remove

EXAMPLES
  $ emb plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/uninstall.ts)_

## `emb plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ emb plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ emb plugins unlink
  $ emb plugins remove

EXAMPLES
  $ emb plugins unlink myplugin
```

## `emb plugins update`

Update installed plugins.

```
USAGE
  $ emb plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/update.ts)_

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
  $ emb tasks run [TASK...] [--json]

ARGUMENTS
  TASK...  List of tasks ids to run (eg: component:task)

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
  $ emb up [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Start the whole project.

EXAMPLES
  $ emb up
```
<!-- commandsstop -->
