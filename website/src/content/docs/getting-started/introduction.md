---
title: Introduction
description: What is EMB and why use it?
---

**EMB** (Enspirit's Monorepo Builder) is a CLI tool for managing Docker-based monorepos. It provides a unified interface for:

- Building and managing Docker images
- Running services via Docker Compose
- Executing tasks across components
- Managing Kubernetes deployments

## Why EMB?

If you're managing a monorepo with multiple Docker services, you've probably encountered:

- **Complex Makefiles** that become unmaintainable
- **Inconsistent workflows** across different services
- **Manual dependency tracking** between images
- **Repetitive docker-compose commands**

EMB solves these problems by:

1. **Auto-discovering components** - Any folder with a `Dockerfile` becomes a buildable component
2. **Managing dependencies** - Builds images in the right order automatically
3. **Providing consistent commands** - `emb up`, `emb logs`, `emb run` work across all projects
4. **Supporting flavors** - Different configurations for development, staging, production

## Quick Example

In a monorepo with this structure:

```
my-project/
├── api/
│   └── Dockerfile
├── web/
│   └── Dockerfile
└── docker-compose.yml
```

EMB automatically discovers the components:

```shell
emb components
```

And provides commands to run them:

```shell
emb up             # Build resources and start all services
emb logs api       # View API logs
emb run api:test   # Run the test task in api
```

Note: `emb up` automatically builds all required resources (Docker images, files) before starting services, regardless of which flavor is being used.

Ready to get started? [Install EMB](/emb/getting-started/installation) then head to the [Tutorials](/emb/tutorial/).
