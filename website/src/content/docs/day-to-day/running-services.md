---
title: Running Services
description: How to run and manage services with EMB
---

EMB wraps Docker Compose to provide a consistent interface for running services.

## Start Services

Start all services:

```shell skip
emb up
```

Start specific services:

```shell skip
emb up api web
```

Start in detached mode (background):

```shell skip
emb up -d
```

## View Running Services

See what's currently running:

```shell skip
emb ps
```

## View Logs

View logs for all services:

```shell skip
emb logs
```

View logs for specific services:

```shell skip
emb logs api
```

Logs are followed in real-time by default. To get a snapshot instead:

```shell skip
emb logs --no-follow api
```

## Stop Services

Stop all services:

```shell skip
emb down
```

## Restart Services

Restart all services:

```shell skip
emb restart
```

Restart specific services:

```shell skip
emb restart api
```

## Running with Flavors

Use a specific flavor configuration:

```shell skip
emb up --flavor production
```

## Next Steps

- Learn about [managing components](/day-to-day/managing-components)
- Understand [task execution](/advanced/tasks)
