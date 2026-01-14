---
title: "Step 5: Running"
description: Running and managing services with EMB
---

# Step 5: Running

EMB wraps Docker Compose to provide a consistent interface for running services.

## Docker Compose Integration

EMB uses `docker-compose.yml` to define how services run:

```yaml
# docker-compose.yml
services:
  api:
    image: tutorial/api:${DOCKER_TAG:-latest}
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=${NODE_ENV:-development}

  web:
    image: tutorial/web:${DOCKER_TAG:-latest}
    ports:
      - "8080:80"
    depends_on:
      - api
```

## Starting Services

Start all services:

```shell skip
emb up
```

This will:
1. Build any images that need building
2. Start all services defined in docker-compose.yml
3. Show logs in real-time

Start in detached mode:

```shell skip
emb up -d
```

Start specific services:

```shell skip
emb up api
```

## Viewing Status

See running containers:

```shell skip
emb ps
```

## Viewing Logs

View all logs:

```shell skip
emb logs
```

Follow specific service logs:

```shell skip
emb logs -f api
```

## Stopping Services

Stop all services:

```shell skip
emb down
```

## Restarting

Restart services:

```shell skip
emb restart
```

Restart specific services:

```shell skip
emb restart api
```

## Running with Flavors

Use production configuration:

```shell skip
emb up --flavor production
```

This applies flavor patches before starting services.

## Getting a Shell

Open a shell in a running container:

```shell skip
emb shell api
```

## Next Step

Continue to [Step 6: Flavors](/tutorial/06-flavors) to learn about environment-specific configurations.
