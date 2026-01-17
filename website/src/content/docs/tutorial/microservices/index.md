---
title: "Microservices"
description: Learn component dependencies and build ordering with a multi-service architecture
---

This tutorial explores how EMB handles complex projects with multiple interdependent components.

## What's New in This Tutorial

- **Four components** - API, worker, gateway, and a shared base image
- **Component dependencies** - Building images in the right order
- **Shared base images** - DRY principle for Docker builds

## The Example Project

We'll use `examples/microservices`:

```
microservices/
├── .emb.yml           # Project configuration
├── .env               # Environment variables
├── docker-compose.yml # Service definitions
├── base/              # Shared base image
│   ├── Dockerfile
│   ├── Embfile.yml
│   └── utils.js
├── api/               # REST API
│   ├── Dockerfile
│   ├── Embfile.yml
│   ├── package.json
│   └── server.js
├── worker/            # Background worker
│   ├── Dockerfile
│   ├── Embfile.yml
│   ├── package.json
│   └── worker.js
└── gateway/           # API Gateway
    ├── Dockerfile
    ├── Embfile.yml
    └── nginx.conf
```

## The Components

```shell exec cwd="../examples/microservices"
emb components
```

```output
 COMPONENT  NAME  ID  CREATED  STATUS
--------------------------------------
 worker
 gateway
 base
 api
```

Four components, each with a specific role:
- **base** - Shared Node.js base image with common utilities
- **api** - REST API service
- **worker** - Background job processor
- **gateway** - Nginx reverse proxy

## Tutorial Pages

1. [Base Images](/emb/tutorial/microservices/01-base-images/) - Creating shared base images
2. [Dependencies](/emb/tutorial/microservices/02-dependencies/) - Declaring component dependencies
3. [Build Ordering](/emb/tutorial/microservices/03-build-ordering/) - How EMB resolves build order

## Prerequisites

You should have completed the [Fullstack App tutorial](/emb/tutorial/fullstack-app/) first.
