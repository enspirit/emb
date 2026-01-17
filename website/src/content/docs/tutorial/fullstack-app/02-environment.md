---
title: "Environment Variables"
description: Using .env files and variable expansion in EMB
---

EMB provides powerful environment variable handling through the `dotenv` plugin and variable expansion syntax.

## The dotenv Plugin

The `dotenv` plugin loads variables from `.env` files:

```yaml
plugins:
  - name: dotenv
    config:
      - .env           # Load this file
      - .env.local     # Then this (overrides previous)
```

Files are loaded in order - later files override earlier ones. This is perfect for having committed defaults in `.env` and local overrides in `.env.local` (which you'd gitignore).

## Our .env File

```shell exec cwd="../examples/fullstack-app"
cat .env
```

```output
DOCKER_TAG=latest
NODE_ENV=development
API_PORT=3000
WEB_PORT=8080
```

These variables become available throughout your configuration.

## Variable Expansion Syntax

EMB uses a special syntax to reference environment variables:

```yaml
env:
  DOCKER_TAG: ${env:DOCKER_TAG:-latest}
```

The format is: `${env:VARIABLE_NAME:-default_value}`

- `env:` - Prefix indicating an environment variable
- `VARIABLE_NAME` - The variable to read
- `:-default_value` - Optional default if the variable isn't set

## How It Works

Let's trace through the variable resolution:

1. `.env` file sets `DOCKER_TAG=latest`
2. `dotenv` plugin loads this into the environment
3. Config uses `${env:DOCKER_TAG:-latest}`
4. EMB resolves this to `latest`

If you override with `DOCKER_TAG=v1.0.0 emb config print`, you'd see `v1.0.0` instead.

## The env Section

Project-wide variables go in the `env` section:

```yaml
env:
  DOCKER_TAG: ${env:DOCKER_TAG:-latest}
  NODE_ENV: ${env:NODE_ENV:-development}
```

These are available to:
- Task scripts (as environment variables)
- Docker Compose files (via variable substitution)
- Other parts of the configuration

## Viewing Variables

Check the env section in config:

```shell exec cwd="../examples/fullstack-app"
emb config print | grep -A 2 "^env:"
```

```output
env:
  DOCKER_TAG: ${env:DOCKER_TAG:-latest}
  NODE_ENV: ${env:NODE_ENV:-development}
```

The config shows the template syntax. At runtime, these are resolved to actual values from your environment.

## Using Variables in Docker Compose

The `docker-compose.yml` can reference these variables:

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

EMB passes the resolved environment to Docker Compose, so these variables work seamlessly.

## Next Step

Continue to [Tasks](/emb/tutorial/fullstack-app/03-tasks/) to learn about defining and running tasks.
