---
title: "Installation"
description: Installing EMB on your system
---

EMB is distributed as an npm package. This page covers installation and verification.

## Install EMB

Install EMB globally using npm:

```bash
npm install -g @enspirit/emb
```

Or using pnpm:

```bash
pnpm add -g @enspirit/emb
```

## Verify Installation

Check that EMB is installed correctly:

```shell skip
emb --version
```

You should see output like:
```
@enspirit/emb/0.16.0 darwin-arm64 node-v22.x.x
```

You should see the version number printed.

## Shell Completion (Optional)

EMB supports shell completion for bash and zsh. To enable it:

**Bash:**
```bash
emb autocomplete bash
```

**Zsh:**
```bash
emb autocomplete zsh
```

Follow the printed instructions to add the completion to your shell configuration.

## Next Step

Continue to [Minimal Configuration](/emb/tutorial/hello-world/02-minimal-config/) to create your first EMB project.
