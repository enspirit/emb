---
title: "Base Images"
description: Creating shared base images for consistent builds
---

When multiple components share common dependencies, you can create a base image to avoid duplication.

## The Problem

Imagine you have several Node.js services that all need:
- The same Node.js version
- Common system packages (like `curl` for health checks)
- Shared utility libraries

Without a base image, you'd duplicate this setup in every Dockerfile.

## The Solution: Base Component

Our microservices example has a `base` component:

```shell exec cwd="../examples/microservices"
cat base/Dockerfile
```

```output
FROM node:22-alpine

# Install common dependencies
RUN apk add --no-cache curl

WORKDIR /app

# Copy shared utilities
COPY utils.js ./

# Set default environment
ENV NODE_ENV=development
```

This creates a foundation image with:
- Node.js 22 on Alpine Linux
- curl installed for health checks
- A shared `utils.js` module
- Common environment setup

## The Base Embfile

The base component's configuration:

```shell exec cwd="../examples/microservices"
cat base/Embfile.yml
```

```output
description: Shared base image with common dependencies

tasks:
  info:
    description: Show base image info
    script: echo "Base image provides shared Node.js utilities"
    # Restrict this task to run only on the local machine (not inside a container).
    # By default, tasks can run on multiple executors (local, container).
    # Setting 'executors: [local]' means:
    # - The task runs on your host machine only
    # - Attempting to run with --executor=container will fail
    # - Useful for tasks that need host-level access or don't make sense in a container
    executors:
      - local
```

## Using the Base Image

Other components inherit from this base. Here's the worker's Dockerfile:

```shell exec cwd="../examples/microservices"
cat worker/Dockerfile
```

```output
ARG DOCKER_TAG=latest
FROM microservices/base:${DOCKER_TAG}

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY worker.js ./

CMD ["node", "worker.js"]
```

Notice `FROM microservices/base:${DOCKER_TAG}` - it inherits from our base image, using a build argument for the tag.

## Benefits

1. **Consistency** - All services use the same Node.js version and utilities
2. **Faster builds** - Common layers are cached in the base image
3. **Single update point** - Update the base, rebuild dependents

## Next Step

Continue to [Dependencies](/emb/tutorial/microservices/02-dependencies/) to see how EMB tracks these relationships.
