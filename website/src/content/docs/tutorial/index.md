---
title: Tutorial Overview
description: Learn EMB through progressive, hands-on tutorials
---

Welcome to the EMB tutorials! This series of hands-on guides will teach you how to use EMB effectively, starting from the basics and progressing to advanced features.

## Learning Path

The tutorials are organized into four progressive sections, each using a real example monorepo from the `examples/` folder:

### 1. Hello World - The Basics

Start here if you're new to EMB. Learn the fundamentals with a minimal single-component project.

**You'll learn:**
- Installing EMB
- Creating a minimal configuration
- How auto-discovery works
- Basic EMB commands

[Start with Hello World →](/emb/tutorial/hello-world/)

### 2. Fullstack App - Tasks & Docker Compose

Build on the basics with a two-component web application (API + frontend).

**You'll learn:**
- Multi-component projects
- Environment variables and the dotenv plugin
- Defining and running tasks
- Docker Compose integration

[Continue to Fullstack App →](/emb/tutorial/fullstack-app/)

### 3. Microservices - Dependencies & Scale

Learn to manage complex projects with multiple interdependent services.

**You'll learn:**
- Shared base images
- Component dependencies
- Build ordering and optimization

[Continue to Microservices →](/emb/tutorial/microservices/)

### 4. Production Ready - Flavors & Deployment

Master environment-specific configurations for staging and production deployments.

**You'll learn:**
- Multi-stage Docker builds
- Flavors and JSON Patch
- Environment-specific configurations

[Continue to Production Ready →](/emb/tutorial/production-ready/)

## Prerequisites

Before starting, ensure you have:

- **Node.js 20+** - Check with `node --version`
- **Docker** - Check with `docker --version`
- **Docker Compose** - Check with `docker compose version`

## Example Monorepos

Each tutorial uses a real, working example from the repository:

| Example | Components | Focus |
|---------|------------|-------|
| `examples/hello-world` | 1 | Minimal setup, auto-discovery |
| `examples/fullstack-app` | 2 | Tasks, environment, docker-compose |
| `examples/microservices` | 4 | Dependencies, base images |
| `examples/production-ready` | 2 | Flavors, multi-stage builds |

You can explore these examples directly in the [EMB repository](https://github.com/enspirit/emb/tree/master/examples).

## Getting Help

- Check the [Reference documentation](/emb/reference/configuration) for detailed configuration options
- Visit the [GitHub repository](https://github.com/enspirit/emb) to report issues or contribute
