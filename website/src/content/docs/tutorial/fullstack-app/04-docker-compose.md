---
title: "Docker Compose"
description: Running multi-service applications with EMB
---

EMB wraps Docker Compose to provide a consistent interface for running services. This page covers the essential commands for managing your application.

## Docker Compose File

EMB uses your project's `docker-compose.yml`:

```shell exec cwd="../examples/fullstack-app"
cat docker-compose.yml
```

```output
services:
  api:
    image: fullstack-app/api:${DOCKER_TAG:-latest}
    ports:
      - "${API_PORT:-3000}:3000"
    environment:
      - NODE_ENV=${NODE_ENV:-development}

  web:
    image: fullstack-app/web:${DOCKER_TAG:-latest}
    ports:
      - "${WEB_PORT:-8080}:80"
    depends_on:
      - api
```

The file references EMB-managed images and environment variables.

## Starting Services

Start all services with:

```shell skip
emb up
```

This will:
1. Build any images that need building
2. Create and start all containers
3. Show logs in real-time

Start specific services:

```shell skip
emb up api
```

## Detached Mode

Run in the background:

```shell skip
emb up -d
```

Or the long form:

```shell skip
emb up --detach
```

## Viewing Status

Check running containers:

```shell skip
emb ps
```

This shows container status, ports, and health.

## Viewing Logs

Follow logs for all services:

```shell skip
emb logs
```

Follow a specific service:

```shell skip
emb logs api
```

Get recent logs without following:

```shell skip
emb logs --no-follow api
```

## Stopping Services

Stop all services:

```shell skip
emb down
```

This stops and removes containers, networks, and volumes created by `up`.

## Restarting Services

Restart all services:

```shell skip
emb restart
```

Restart specific services:

```shell skip
emb restart api
```

## Getting a Shell

Open a shell in a running container:

```shell skip
emb shell api
```

This opens an interactive shell (typically `/bin/sh` or `/bin/bash`).

## Environment Integration

EMB automatically passes your project's environment variables to Docker Compose. This means:

- Variables from `.env` files are available
- Variables defined in the `env:` section are available
- Command-line overrides work: `NODE_ENV=production emb up`

## Next Step

Continue to [Building Images](/emb/tutorial/fullstack-app/05-building/) to learn about building and tagging Docker images.
