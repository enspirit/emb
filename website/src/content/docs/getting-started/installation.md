---
title: Installation
description: How to install EMB
---

EMB requires **Node.js 22+** and **Docker** to be installed on your system.

## Using npm

The recommended way to install EMB is via npm:

```shell
npm install -g @enspirit/emb
```

## Verify Installation

After installation, verify EMB is working:

```shell
emb --version
```

You should see output like:

```output
@enspirit/emb/0.26.0 darwin-x64 node-v22.18.0
```

## Requirements

- **Node.js 22+** - EMB is built with modern JavaScript features
- **Docker** - Required for building images and running containers
- **Docker Compose** - Required for service orchestration

## Shell Completion

EMB supports shell autocompletion. To set it up:

```shell
emb autocomplete
```

This will display instructions for your shell (bash, zsh, or fish).

## Next Steps

Now that EMB is installed, head to the [Tutorials](/emb/tutorial/) to learn EMB step by step.
