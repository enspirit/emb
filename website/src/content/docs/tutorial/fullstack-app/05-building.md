---
title: "Building Images"
description: Building and tagging Docker images with EMB
---

EMB manages Docker image builds with automatic tagging based on your project configuration.

## Listing Resources

First, see what resources are available:

```shell exec cwd="../examples/fullstack-app"
emb resources
```

```output
 ID         NAME   TYPE          REFERENCE
----------------------------------------------------------
 api:image  image  docker/image  fullstack-app/api:latest
 web:image  image  docker/image  fullstack-app/web:latest
```

Each component has an `image` resource that can be built.

## Building All Images

Build all images at once:

```shell skip
emb resources build
```

EMB will:
1. Determine the build order (respecting dependencies)
2. Build each image with appropriate tags
3. Cache results to avoid rebuilding unchanged images

## Building Specific Components

Build just one component:

```shell skip
emb resources build api
```

Or multiple:

```shell skip
emb resources build api web
```

## Image Naming

Images are tagged using the pattern:

```
{project-name}/{component-name}:{tag}
```

For our project with `DOCKER_TAG=latest`:
- `fullstack-app/api:latest`
- `fullstack-app/web:latest`

## Viewing Built Images

After building, see your images:

```shell skip
emb images
```

## Force Rebuild

Skip the cache and force a full rebuild:

```shell skip
emb resources build --force
```

## Dry Run

See what would be built without actually building:

```shell skip
emb resources build --dry-run
```

## Build Logs

Build logs are saved to `.emb/default/logs/docker/build/`. If a build fails, check the log for details.

## Custom Tags

Override the tag at build time:

```shell skip
DOCKER_TAG=v1.0.0 emb resources build
```

This builds with tag `v1.0.0` instead of `latest`.

## Summary

You've now learned the fullstack-app features:

- **Multiple components** with Embfiles
- **Environment variables** via dotenv plugin
- **Tasks** at project and component levels
- **Docker Compose** for running services
- **Image building** with automatic tagging

## Next Tutorial

Ready to learn about component dependencies? Continue to [Microservices](/emb/tutorial/microservices/) to explore:
- Shared base images
- Component dependencies
- Build ordering
