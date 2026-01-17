---
title: "Auto-Discovery"
description: How EMB automatically discovers components in your project
---

The `autodocker` plugin scans your project and automatically registers components. Let's see how it works.

## How Auto-Discovery Works

When EMB loads your project, the `autodocker` plugin:

1. Scans all directories in your project root
2. Looks for directories containing a `Dockerfile`
3. Registers each as a component with default settings
4. Creates a `docker/image` resource for building the image

## Viewing Discovered Components

Use the `components` command to see what EMB discovered:

```shell exec cwd="../examples/hello-world"
emb components
```

```output
 COMPONENT  NAME  ID  CREATED  STATUS
--------------------------------------
 api
```

EMB found our `api` component automatically.

## Viewing the Full Configuration

To see exactly how EMB configured the component, use `config print`:

```shell exec cwd="../examples/hello-world"
emb config print
```

```output
components:
  api:
    rootDir: api
    resources:
      image:
        type: docker/image
        params: {}
defaults: {}
env: {}
flavors: {}
plugins:
  - name: autodocker
project:
  name: hello-world
tasks: {}
vars: {}
```

Notice how EMB added the `components` section with all the details for building the API image - you didn't have to write any of this!

## The Generated Resource

Each auto-discovered component gets a `docker/image` resource with these defaults:

```yaml
resources:
  image:
    type: docker/image    # Resource type
    # params:             # Optional build parameters
    #   target: ...       # Dockerfile target stage
    #   args: ...         # Build arguments
```

The image will be tagged as `{project-name}/{component-name}:latest`, so our API image will be `hello-world/api:latest`.

## Next Step

Continue to [First Commands](/emb/tutorial/hello-world/04-first-commands/) to learn the essential EMB commands.
