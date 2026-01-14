---
title: "Step 2: Components"
description: Understanding how EMB discovers and manages components
---

# Step 2: Components

Components are the building blocks of an EMB monorepo. Each component typically represents a service, tool, or library.

## Auto-Discovery

With the `autodocker` plugin, EMB automatically discovers components by looking for folders containing a `Dockerfile`.

Our tutorial has two components:

```shell exec cwd="tutorial"
ls -d */
```

```output
api/
web/
```

Both have Dockerfiles, so EMB discovers them automatically.

## Viewing Components

Let's see what EMB discovered:

```shell exec cwd="tutorial"
emb config print | head -20
```

```output
components:
  web:
    description: Web frontend for the tutorial
    resources:
      image:
        params: {}
        type: docker/image
        dependencies:
          - api:image
    rootDir: web
  api:
    description: REST API service for the tutorial
    resources:
      image:
        type: docker/image
        params:
          target: development
    tasks:
      test:
        description: Run API tests
```

## Component Structure

Each component can have:

### Dockerfile

The Docker image definition:

```dockerfile
# api/Dockerfile
FROM node:22-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "server.js"]
```

### Embfile.yml

Optional component-specific configuration:

```yaml
# api/Embfile.yml
description: REST API service for the tutorial

resources:
  image:
    type: docker/image
    params:
      target: development

tasks:
  test:
    description: Run API tests
    script: npm test
```

## Resources

Components define **resources** - things EMB can build:

- `docker/image` - A Docker image
- `file` - A generated file

Our API component has one resource:

```yaml
resources:
  image:
    type: docker/image
    params:
      target: development  # Which Dockerfile stage to build
```

## Dependencies

Components can depend on each other. Our web component depends on the API image:

```yaml
# web/Embfile.yml
resources:
  image:
    type: docker/image
    dependencies:
      - api:image  # Build API first
```

This ensures the API image is built before the web image.

## Next Step

Continue to [Step 3: Tasks](/tutorial/03-tasks) to learn how to define and run tasks.
