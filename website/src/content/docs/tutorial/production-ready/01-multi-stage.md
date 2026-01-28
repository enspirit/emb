---
title: "Multi-Stage Builds"
description: Using Dockerfile targets for different environments
---

Multi-stage Dockerfiles let you create different images from the same Dockerfile, each optimized for its purpose.

## The API Dockerfile

Our API uses a four-stage Dockerfile:

```shell exec cwd="../examples/production-ready"
cat api/Dockerfile
```

```output
# Base stage with common setup
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

# Development stage - includes dev dependencies and tools
FROM base AS development
COPY package.json ./
RUN npm install
COPY . ./
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production build stage
FROM base AS builder
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage - minimal image
FROM base AS production
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
```

## Understanding the Stages

### base
Common foundation - Node.js with curl for health checks.

### development
- Full `npm install` (includes devDependencies)
- Hot reload with `npm run dev`
- Optimized for developer experience

### builder
Intermediate stage that compiles TypeScript to JavaScript. Not used directly.

### production
- Production-only dependencies (`npm install --omit=dev`)
- Compiled assets from builder
- Runs as non-root user (`USER node`)
- Minimal image size

## Specifying the Target

In your Embfile, set which stage to build:

```yaml
resources:
  image:
    type: docker/image
    params:
      target: development  # or production
```

## The Web Dockerfile

The web component has a simpler two-stage setup:

```shell exec cwd="../examples/production-ready"
cat web/Dockerfile
```

```output
# Development stage with live reload
FROM nginx:alpine AS development
COPY index.html /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Production stage with optimizations
FROM nginx:alpine AS production
COPY index.html /usr/share/nginx/html/
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
RUN rm -rf /usr/share/nginx/html/*.map 2>/dev/null || true
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Key differences:
- **development**: Uses `nginx.conf` with debugging features
- **production**: Uses `nginx.prod.conf` with optimizations, removes source maps

## Default Target

The project configuration sets a default target:

```yaml
defaults:
  docker:
    tag: ${env:DOCKER_TAG}
    target: development
```

All components use `development` by default. Flavors can override this.

## Next Step

Continue to [Flavors Introduction](/emb/tutorial/production-ready/02-flavors-intro/) to learn how to switch between development and production builds.
