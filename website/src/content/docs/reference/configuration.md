---
title: Configuration Reference
description: Complete reference for .emb.yml configuration
---

This is the complete reference for EMB configuration files.

## Configuration Files

EMB uses two types of configuration files:

- **`.emb.yml`** - Project-level configuration at the monorepo root
- **`Embfile.yml`** - Component-level configuration in each component folder

## Project Configuration (.emb.yml)

### project

Required. Basic project information.

```yaml
project:
  name: my-project      # Required: Project identifier
  rootDir: .            # Optional: Root directory (default: .)
```

### plugins

Optional. List of plugins to load.

```yaml
plugins:
  - name: autodocker    # Auto-discover components with Dockerfiles
  - name: dotenv        # Load .env files
    config:
      - .env
      - .env.local
  - name: embfiles      # Load component Embfile.yml files
```

**Built-in plugins:**
- `autodocker` - Auto-discovers components by looking for Dockerfiles
- `dotenv` - Loads environment variables from .env files
- `embfiles` - Loads component configuration from Embfile.yml files
- `vault` - Fetches secrets from HashiCorp Vault (see [Secrets Management](/emb/advanced/secrets/))

### env

Optional. Environment variables available to all processes.

```yaml
env:
  DOCKER_TAG: ${env:DOCKER_TAG:-latest}
  NODE_ENV: development
```

Supports variable expansion with `${env:VAR_NAME:-default}` syntax.

### vars

Optional. Variables for string expansion (not passed to subprocesses).

```yaml
vars:
  version: "1.0.0"
  registry: "docker.io/myorg"
```

### defaults

Optional. Default settings for builds and execution.

```yaml
defaults:
  docker:
    tag: ${env:DOCKER_TAG}      # Default image tag
    target: development          # Default build target
    platform: linux/amd64        # Target platform (e.g., linux/amd64, linux/arm64)
    buildArgs:                   # Default build arguments
      NODE_ENV: development
    labels:                      # Default labels
      maintainer: team@example.com
  kubernetes:
    namespace: staging                           # Default namespace for K8s operations
    selectorLabel: app.kubernetes.io/component   # Label for pod selection
```

**Kubernetes defaults:**

| Option | Description | Default |
|--------|-------------|---------|
| `namespace` | Default Kubernetes namespace | `default` |
| `selectorLabel` | Label name used to find component pods | `app.kubernetes.io/component` |

### components

Optional. Inline component definitions (usually loaded via plugins).

```yaml
components:
  api:
    rootDir: services/api
    resources:
      image:
        type: docker/image
    tasks:
      test:
        script: npm test
```

### tasks

Optional. Project-level tasks.

```yaml
tasks:
  lint:
    script: npm run lint

  deploy:
    pre: [lint, test]
    script: ./scripts/deploy.sh
```

### flavors

Optional. Project-level flavor configurations.

```yaml
flavors:
  production:
    patches:
      - op: replace
        path: /env/NODE_ENV
        value: production
```

## Component Configuration (Embfile.yml)

### rootDir

Optional. Path to component root (auto-detected).

```yaml
rootDir: services/api
```

### description

Optional. Human-readable description.

```yaml
description: REST API service
```

### resources

Optional. Resources this component provides.

```yaml
resources:
  image:
    type: docker/image
    dependencies:
      - base:image
    params:
      target: development
      buildArgs:
        NODE_ENV: development
      labels:
        version: "1.0.0"
      context: .
      dockerfile: Dockerfile
```

**Resource types:**

#### docker/image

Builds a Docker image.

| Parameter | Type | Description |
|-----------|------|-------------|
| `image` | string | Image name (without project prefix or tag). Defaults to component name. |
| `tag` | string | Image tag. Defaults to `defaults.docker.tag` or `latest`. |
| `target` | string | Build stage to target |
| `platform` | string | Target platform (e.g., `linux/amd64`, `linux/arm64`) |
| `buildArgs` | object | Build arguments |
| `labels` | object | Image labels |
| `context` | string | Build context path |
| `dockerfile` | string | Dockerfile path |

#### file

Generates a file.

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | string | Output file path (defaults to resource name) |
| `content` | string | Content to write to the file (supports template expansion with secrets) |
| `script` | string | Script to generate the file |

**Example with content and secrets:**
```yaml
resources:
  .env:
    type: file
    params:
      content: |
        DATABASE_URL=${op:Private/db-credentials#connection_string}
        API_KEY=${op:Private/api-keys#production}
```

**Example with script:**
```yaml
resources:
  config.json:
    type: file
    params:
      path: config.json
      script: |
        echo '{"key": "value"}' > config.json
```

Note: If both `content` and `script` are provided, `content` takes precedence.

### tasks

Optional. Component tasks.

```yaml
tasks:
  test:
    description: Run tests
    script: npm test
    executors:
      - container           # Run in container (default)
    vars:
      NODE_ENV: test
```

**Task properties:**

| Property | Type | Description |
|----------|------|-------------|
| `description` | string | Task description |
| `script` | string | Shell script to execute |
| `pre` | array | Tasks to run before this one |
| `executors` | array | Where to run: `local`, `container`, or `kubernetes` |
| `interactive` | boolean | Requires TTY (default: false) |
| `vars` | object | Task-specific variables |
| `confirm` | object | Require user confirmation |

### flavors

Optional. Component-level flavors.

```yaml
flavors:
  production:
    patches:
      - op: replace
        path: /resources/image/params/target
        value: production
```

### kubernetes

Optional. Kubernetes-specific configuration for the component.

```yaml
kubernetes:
  selector: app=api,tier=backend   # Custom label selector for finding pods
  container: main                   # Container name for multi-container pods
```

| Option | Description |
|--------|-------------|
| `selector` | Label selector to find pods (overrides default `{selectorLabel}={component}`) |
| `container` | Container name for multi-container pods |

## Variable Expansion

EMB supports variable expansion in configuration values:

```yaml
env:
  # Use environment variable with default
  TAG: ${env:DOCKER_TAG:-latest}

  # Use another config variable
  IMAGE: ${vars:registry}/app:${env:TAG}

  # Use a secret from Vault
  DATABASE_URL: ${vault:secret/myapp/database#url}
```

**Syntax:**
- `${env:VAR_NAME}` - Environment variable (required)
- `${env:VAR_NAME:-default}` - Environment variable with default
- `${vars:VAR_NAME}` - Config variable
- `${vault:path#key}` - Secret from Vault (requires vault plugin)

## JSON Patch Operations

Flavors use JSON Patch (RFC 6902) operations:

```yaml
patches:
  # Add a new property
  - op: add
    path: /resources/image/params/labels/version
    value: "2.0.0"

  # Replace existing value
  - op: replace
    path: /resources/image/params/target
    value: production

  # Remove a property
  - op: remove
    path: /resources/image/params/buildArgs/DEBUG

  # Move a property
  - op: move
    from: /old/path
    path: /new/path

  # Copy a property
  - op: copy
    from: /source/path
    path: /dest/path
```

## Full Example

```yaml
# .emb.yml
project:
  name: my-app

plugins:
  - name: autodocker
  - name: dotenv
    config: [.env]
  - name: embfiles

env:
  DOCKER_TAG: ${env:DOCKER_TAG:-latest}
  REGISTRY: docker.io/myorg

defaults:
  docker:
    tag: ${env:DOCKER_TAG}

tasks:
  deploy:
    pre: [build]
    script: ./deploy.sh

flavors:
  production:
    patches:
      - op: replace
        path: /env/DOCKER_TAG
        value: ${env:VERSION:-latest}
```

```yaml
# api/Embfile.yml
description: REST API service

resources:
  image:
    type: docker/image
    params:
      target: development

tasks:
  test:
    description: Run API tests
    script: npm test

  migrate:
    description: Run database migrations
    executors: [local]
    script: npm run migrate

flavors:
  production:
    patches:
      - op: replace
        path: /resources/image/params/target
        value: production
```
