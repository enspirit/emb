---
title: "Minimal Configuration"
description: Creating your first .emb.yml configuration file
---

Every EMB project needs a `.emb.yml` file at its root. Let's look at the simplest possible configuration.

## The Configuration File

Here's the complete configuration for our hello-world example:

```shell exec cwd="../examples/hello-world"
cat .emb.yml
```

```output
project:
  name: hello-world

plugins:
  - name: autodocker
```

That's it - just 5 lines! Let's break it down.

## Project Section

```yaml
project:
  name: hello-world
```

The `project` section is required and must include a `name`. This name is used for:
- Docker image prefixes (e.g., `hello-world/api:latest`)
- Log directories and other generated files
- Identifying the project in command output

## Plugins Section

```yaml
plugins:
  - name: autodocker
```

Plugins extend EMB's functionality. The `autodocker` plugin automatically discovers components by scanning for directories containing a `Dockerfile`.

Without this plugin, you'd need to manually define each component in your configuration. With it, EMB does the discovery for you.

## What This Configuration Does

With just these 5 lines, EMB will:

1. **Scan the project** for directories containing `Dockerfile`
2. **Register each as a component** with sensible defaults
3. **Create Docker image resources** for each component
4. **Set image names** using the pattern `{project-name}/{component-name}:latest`

## Project Structure

Our hello-world example has this structure:

```
hello-world/
├── .emb.yml      # Project configuration
├── .emb/         # Generated files (gitignored)
└── api/          # Component with Dockerfile
    ├── Dockerfile
    ├── package.json
    └── server.js
```

The `api/` directory contains a `Dockerfile`, so EMB will discover it as a component.

## Next Step

Continue to [Auto-Discovery](/emb/tutorial/hello-world/03-auto-discovery/) to see how EMB discovers and configures components.
