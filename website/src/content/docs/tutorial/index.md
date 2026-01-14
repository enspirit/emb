---
title: Tutorial Overview
description: Learn EMB step by step with a hands-on tutorial
---

# EMB Tutorial

This tutorial walks you through building a monorepo from scratch, introducing EMB features progressively.

## What You'll Build

A simple web application with two services:
- **api** - A Node.js REST API
- **web** - An nginx frontend that proxies to the API

## What You'll Learn

1. **Project Setup** - Creating an EMB configuration
2. **Components** - How EMB discovers and manages components
3. **Building** - Building Docker images with dependencies
4. **Running** - Starting and managing services
5. **Tasks** - Defining and running custom tasks
6. **Flavors** - Environment-specific configurations

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- EMB installed (`npm install -g @enspirit/emb`)

## Tutorial Structure

The tutorial monorepo lives in `website/tutorial/` and demonstrates a realistic project structure:

```
tutorial/
├── .emb.yml              # Project configuration
├── .env                  # Environment variables
├── docker-compose.yml    # Service definitions
├── api/                  # API service
│   ├── Dockerfile
│   ├── Embfile.yml
│   ├── package.json
│   └── server.js
└── web/                  # Web frontend
    ├── Dockerfile
    ├── Embfile.yml
    ├── index.html
    └── nginx.conf
```

## Let's Get Started

Continue to [Step 1: Project Setup](/tutorial/01-project-setup) to begin building your monorepo.
