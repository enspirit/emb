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
* [`emb help [COMMAND]`](#emb-help-command)
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
<!-- commandsstop -->
