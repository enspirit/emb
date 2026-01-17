---
title: "Hello World"
description: Learn EMB basics with a minimal single-component project
---

This tutorial introduces EMB fundamentals using a minimal project - a single API service with just two files.

## What You'll Learn

1. **Installation** - Getting EMB up and running
2. **Minimal Configuration** - The simplest possible `.emb.yml`
3. **Auto-Discovery** - How EMB finds your components
4. **First Commands** - Essential EMB commands

## The Example Project

We'll use `examples/hello-world`, the simplest possible EMB project:

```
hello-world/
├── .emb.yml          # Just 6 lines of config
└── api/
    ├── Dockerfile    # Standard Node.js image
    ├── package.json
    └── server.js     # Simple Express API
```

This example demonstrates that EMB can work with minimal configuration - you don't need to define every component explicitly.

## Prerequisites

Before starting, ensure you have:

- Node.js 20+ installed
- Docker installed and running

## Let's Begin

Continue to [Installation](/emb/tutorial/hello-world/01-installation/) to set up EMB on your system.
