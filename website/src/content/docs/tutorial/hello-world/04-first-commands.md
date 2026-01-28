---
title: "First Commands"
description: Essential EMB commands for everyday use
---

Now that you understand how EMB discovers components, let's learn the essential commands.

## Listing Components

You've already seen `emb components`:

```shell exec cwd="../examples/hello-world"
emb components
```

```output
 COMPONENT  NAME  ID  CREATED  STATUS
--------------------------------------
 api
```

## Listing Resources

Resources are things EMB can build. List them with:

```shell exec cwd="../examples/hello-world"
emb resources
```

```output
 ID         NAME   TYPE          REFERENCE
--------------------------------------------------------
 api:image  image  docker/image  hello-world/api:latest
```

Each resource has:
- **ID**: Unique identifier (`component:resource`)
- **NAME**: The resource name within the component
- **TYPE**: The resource type (e.g., `docker/image`)
- **REFERENCE**: The full image reference with tag

## Building Resources

Build all resources with:

```shell skip
emb resources build
```

Or build a specific component:

```shell skip
emb resources build api
```

EMB will:
1. Check if the image needs rebuilding
2. Run `docker build` with the appropriate tags
3. Cache the result to avoid unnecessary rebuilds

## Viewing Images

After building, see your images:

```shell skip
emb images
```

This shows all Docker images managed by EMB for your project.

## Getting Help

Every command has built-in help:

```shell exec cwd="../examples/hello-world"
emb --help | head -20
```

```output
A replacement for our Makefile-for-monorepos

VERSION
  @enspirit/emb/0.22.1 darwin-arm64 node-v22.21.1

USAGE
  $ emb [COMMAND]

TOPICS
  components  List & build components resources
  config      It's all about config
  containers  List, delete, prune docker images
  images      List, delete, prune docker containers
  kubernetes  Manage project instances on kubernetes
  logs        Get service logs.
  resources   List, clean, build resources
  secrets     List all secret references in the configuration.
  tasks       List and run tasks

COMMANDS
```

For help on a specific command:

```shell skip
emb resources --help
emb resources build --help
```

## Summary

You've learned the basics of EMB:

- **.emb.yml** - The project configuration file
- **autodocker plugin** - Automatically discovers components
- **emb components** - List discovered components
- **emb resources** - List buildable resources
- **emb resources build** - Build Docker images

## Next Tutorial

Ready to learn more? Continue to [Fullstack App](/emb/tutorial/fullstack-app/) to explore:
- Multiple components
- Environment variables
- Tasks
- Docker Compose integration
