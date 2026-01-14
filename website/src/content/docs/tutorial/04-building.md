---
title: "Step 4: Building"
description: Building Docker images with EMB
---

# Step 4: Building

EMB manages Docker image builds, handling dependencies and caching automatically.

## Build All Images

To build all images in your project:

```shell skip
emb resources build
```

This will:
1. Analyze dependencies between components
2. Build images in the correct order
3. Cache results to avoid rebuilding unchanged images

## Build Specific Components

Build a single component:

```shell skip
emb resources build api
```

## Understanding Dependencies

Our web component depends on the API:

```yaml
# web/Embfile.yml
resources:
  image:
    dependencies:
      - api:image
```

When you run `emb resources build web`, EMB automatically builds `api:image` first.

## Multi-Stage Builds

The API uses a multi-stage Dockerfile:

```dockerfile
FROM node:22-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "server.js"]

FROM development AS production
ENV NODE_ENV=production
RUN npm ci --only=production
CMD ["node", "server.js"]
```

The `target` parameter in Embfile.yml controls which stage to build:

```yaml
resources:
  image:
    params:
      target: development  # or production
```

## Build with Flavors

Use the production flavor to build production images:

```shell skip
emb resources build --flavor production
```

This applies the flavor patches, changing the target to `production`.

## Force Rebuild

To bypass the cache and force a rebuild:

```shell skip
emb resources build --force
```

## View Built Images

After building, see your images:

```shell skip
emb images
```

## Next Step

Continue to [Step 5: Running](/tutorial/05-running) to learn how to run your services.
