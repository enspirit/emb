---
title: Running Services
description: How to run and manage services with EMB
---

# Running Services

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

Follow logs in real-time:

```shell skip
emb logs -f api
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
