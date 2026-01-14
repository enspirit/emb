---
title: Your First Monorepo
description: Set up and explore your first EMB-managed monorepo
---

Let's explore EMB using the tutorial project included in the documentation.

## Project Structure

The tutorial project has this structure:

```
tutorial/
├── .emb.yml              # EMB configuration
├── .env                  # Environment variables
├── docker-compose.yml    # Docker Compose services
├── api/
│   ├── Dockerfile
│   ├── Embfile.yml       # Component configuration
│   ├── package.json
│   └── server.js
└── web/
    ├── Dockerfile
    ├── Embfile.yml
    ├── index.html
    └── nginx.conf
```

The `.emb.yml` file configures EMB. With the `autodocker` plugin, EMB auto-discovers any folder containing a `Dockerfile` as a component.

## Discovering Components

First, let's make sure no services are running:

```shell exec cwd="tutorial"
emb down
```

Now let's see what EMB finds in the tutorial project:

```shell exec cwd="tutorial"
emb components
```

```output
 COMPONENT  NAME  ID  CREATED  STATUS
--------------------------------------
 web
 api
```

EMB automatically discovered both components (`api` and `web`) from their Dockerfiles. The `emb components` command also shows container status (similar to `docker compose ps`) - currently empty since no services are running.

## Starting Services

Let's start the services with `emb up`:

```shell skip
emb up
```

This builds any required Docker images and starts the services. Now if we run `emb components` again:

```shell skip
emb components
```

```
 COMPONENT  NAME              ID             CREATED        STATUS
-------------------------------------------------------------------
 api        /tutorial-api-1   c0da47f2601a   5 seconds ago  Up 4 seconds
 web        /tutorial-web-1   7955ccf421e7   5 seconds ago  Up 4 seconds
```

The output now includes container information: name, ID, creation time, and status - just like `docker compose ps`.

## Listing Tasks

Components can define tasks. Let's see what tasks are available:

```shell exec cwd="tutorial"
emb tasks
```

```output
 NAME    COMPONENT  DESCRIPTION                  ID
------------------------------------------------------------
 hello              Say hello from the tutorial  hello
 health  api        Check API health             api:health
 test    api        Run API tests                api:test
```

Tasks can be defined at the project level (like `hello`) or within components (like `api:test`).

## Running a Task

Let's run the hello task:

```shell skip
emb run hello
```

```output
Hello from the EMB tutorial!
Components: api, web
```

## What's Next?

Now that you understand the basics, continue with the full tutorial:

- [Step 1: Project Setup](/emb/tutorial/01-project-setup) - Understand the configuration
- [Step 2: Components](/emb/tutorial/02-components) - Learn about component discovery
- [Step 3: Tasks](/emb/tutorial/03-tasks) - Define and run tasks

Or jump to day-to-day usage:

- [Building Resources](/emb/day-to-day/building-resources) - Build Docker images
- [Running Services](/emb/day-to-day/running-services) - Start and manage services
