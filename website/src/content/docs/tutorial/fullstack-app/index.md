---
title: "Fullstack App"
description: Learn tasks, environment variables, and Docker Compose with a two-component project
---

Building on the Hello World basics, this tutorial explores a more realistic project with two components and introduces key EMB features.

## What's New in This Tutorial

- **Multiple components** - API backend + web frontend
- **Environment variables** - Using `.env` files and variable expansion
- **Tasks** - Running scripts at project and component levels
- **Docker Compose** - Managing multi-service applications

## The Example Project

We'll use `examples/fullstack-app`:

```
fullstack-app/
├── .emb.yml           # Project configuration
├── .env               # Environment variables
├── docker-compose.yml # Service definitions
├── api/               # Backend API
│   ├── Dockerfile
│   ├── Embfile.yml    # Component-specific config
│   ├── package.json
│   └── server.js
└── web/               # Frontend
    ├── Dockerfile
    ├── Embfile.yml
    ├── index.html
    └── nginx.conf
```

## Project Configuration

Let's look at the full configuration:

```shell exec cwd="../examples/fullstack-app"
cat .emb.yml
```

```output
project:
  name: fullstack-app

plugins:
  - name: autodocker
  - name: dotenv
    config:
      - .env
  - name: embfiles

env:
  DOCKER_TAG: ${env:DOCKER_TAG:-latest}
  NODE_ENV: ${env:NODE_ENV:-development}

# Project-level tasks demonstrate EMB's task system at the monorepo level.
# These tasks apply to the entire project, not individual components.
tasks:
  # Showcases: task variables with environment fallback
  # The 'vars' block defines variables available in the script.
  # Variables can reference environment variables with defaults: ${env:VAR:-default}
  setup:
    description: Set up the development environment
    vars:
      ENV: ${env:NODE_ENV:-development}
    script: |
      echo "Setting up $ENV environment"

  # Showcases: simple task with description
  # This task will be used as a prerequisite for 'build'
  deps:
    description: Install project dependencies
    script: |
      echo "Installing dependencies..."
      echo "deps installed" > /tmp/fullstack-tasks.txt

  # Showcases: task prerequisites (pre)
  # The 'pre' array lists tasks that must run before this one.
  # EMB automatically runs 'deps' before 'build' when you run 'emb run build'
  build:
    description: Build the entire project
    pre: ['deps']
    script: |
      echo "Building project..."
      grep 'deps' /tmp/fullstack-tasks.txt || (echo "Dependencies not installed" && exit 1)
```

This configuration introduces several new concepts we'll explore in the following pages.

## Tutorial Pages

1. [Project Structure](/emb/tutorial/fullstack-app/01-project-structure/) - Multi-component setup with Embfiles
2. [Environment Variables](/emb/tutorial/fullstack-app/02-environment/) - Using dotenv and variable expansion
3. [Tasks](/emb/tutorial/fullstack-app/03-tasks/) - Defining and running tasks
4. [Docker Compose](/emb/tutorial/fullstack-app/04-docker-compose/) - Managing services
5. [Building Images](/emb/tutorial/fullstack-app/05-building/) - Building and tagging images

## Prerequisites

You should have completed the [Hello World tutorial](/emb/tutorial/hello-world/) first.
