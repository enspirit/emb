---
title: Migrating from Makefile
description: How EMB compares to makefile-for-monorepos and how to migrate
---

If you've been using [makefile-for-monorepos](https://github.com/enspirit/makefile-for-monorepos), this guide explains the differences and how to migrate to EMB.

## Why EMB?

EMB was created as the spiritual successor to makefile-for-monorepos, addressing its limitations while keeping the same philosophy:

- **Auto-discovery** of components (folders with Dockerfiles)
- **Incremental builds** using sentinel files
- **Simple commands** for common operations

### What EMB Improves

| Aspect | makefile-for-monorepos | EMB |
|--------|------------------------|-----|
| **Configuration** | `config.mk` + per-component `makefile.mk` | Single `.emb.yml` + optional `Embfile.yml` per component |
| **Syntax** | Make syntax (error-prone, hard to debug) | YAML (readable, validated) |
| **Dependencies** | Manual declaration in makefiles | Declared in YAML, automatically resolved |
| **Flavors** | Environment variables + conditionals | First-class support with JSON Patch |
| **Tasks** | Custom make targets | Declarative task definitions with executors |
| **Error messages** | Cryptic make errors | Clear, actionable error messages |
| **Extensibility** | Include makefiles | Plugin system |

## Command Mapping

Here's how makefile commands map to EMB:

### Building

| Makefile | EMB | Notes |
|----------|-----|-------|
| `make images` | `emb resources build` | Build all images |
| `make {component}.image` | `emb resources build {component}:image` | Build specific image |
| `make images FORCE=1` | `emb resources build --force` | Force rebuild |
| `make -j8 images` | `emb resources build -j8` | Build up to 8 resources in parallel (dependency-ordered) |
| `make -j images` | `emb resources build -j auto` | Parallel build, `auto` = min(CPU count, 4) |
| `make -k images` | `emb resources build --keep-going` | Keep building after a failure, then report all failures |

**EMB builds serially by default.** Unlike `make`, where parallelism is a property of your invocation, EMB defaults to one resource at a time — so a `make -j8` habit silently becomes a serial build unless you pass `-j`. To get your parallelism back, either pass `-j` on each invocation, or set a project-wide default in `.emb.yml`:

```yaml
defaults:
  build:
    concurrency: auto  # or a positive integer, e.g. 8
```

The `--jobs` flag overrides `defaults.build.concurrency`. Dependency order is always respected: a resource only starts once all of its `dependsOn` resources have succeeded, so raising `-j` can never build something out of order.

Like `make -k`, `--keep-going` carries on with resources that don't depend on the failed one and skips the ones that do, reporting every failure at the end. Without it EMB fails fast: the first failure stops new builds from starting (those already running are allowed to finish).

### Lifecycle

| Makefile | EMB | Notes |
|----------|-----|-------|
| `make up` | `emb up` | Build and start services |
| `make down` | `emb down` | Stop services |
| `make ps` | `emb ps` | Show running services |
| `make {component}.logs` | `emb logs {service}` | View logs (followed by default) |
| `make {component}.bash` | `emb shell {service}` | Get a shell |
| `make {component}.on` | `emb up {component}` | Start specific service |
| `make {component}.off` | `emb down {component}` | Stop specific service |

### Testing

| Makefile | EMB | Notes |
|----------|-----|-------|
| `make tests` | `emb run test` | Run all tests (if task defined) |
| `make {component}.tests` | `emb run {component}:test` | Run component tests |

## Migration Steps

### 1. Create `.emb.yml`

Replace your `config.mk` with a `.emb.yml` file:

```yaml
# .emb.yml
project:
  name: my-project

plugins:
  - autodocker  # Auto-discovers components with Dockerfiles

env:
  DOCKER_TAG: ${env:DOCKER_TAG:-latest}
```

### 2. Convert Component Configuration

If you have per-component `makefile.mk` files with custom settings, create `Embfile.yml` files instead:

**Before (`api/makefile.mk`):**
```makefile
DOCKER_BUILD_TARGET = production
DEPENDS_ON = base
```

**After (`api/Embfile.yml`):**
```yaml
resources:
  image:
    type: docker/image
    dependsOn:
      - base:image
    params:
      target: production
```

### 3. Convert Dependencies

Dependencies between components are now declared in YAML:

**Before (`config.mk`):**
```makefile
api.image: base.image
web.image: base.image
```

**After (in each component's `Embfile.yml`):**
```yaml
# api/Embfile.yml
resources:
  image:
    type: docker/image
    dependsOn:
      - base:image
```

### 4. Convert Custom Tasks

Custom make targets become EMB tasks:

**Before (`api/makefile.mk`):**
```makefile
api.test:
	docker-compose run --rm api npm test

api.lint:
	docker-compose run --rm api npm run lint
```

**After (`api/Embfile.yml`):**
```yaml
tasks:
  test:
    description: Run tests
    executor:
      type: docker/cli
    run: npm test

  lint:
    description: Run linter
    executor:
      type: docker/cli
    run: npm run lint
```

### 5. Convert Flavors

Environment-specific configurations become flavors:

**Before (environment variables):**
```bash
DOCKER_BUILD_TARGET=production make images
```

**After (`.emb.yml`):**
```yaml
flavors:
  production:
    patches:
      - op: replace
        path: /components/api/resources/image/params/target
        value: production
```

Then use:
```bash
emb up --flavor production
```

## Key Differences

### Sentinel Files

Both tools use sentinel files for incremental builds. EMB stores them in `.emb/sentinels/` instead of `.build/`.

To clean sentinels:
```bash
# Makefile
make clean

# EMB
emb clean
```

### Docker Compose

Both tools use docker-compose under the hood. Your existing `docker-compose.yml` files work with EMB without modification.

### No More Make Debugging

One of the biggest improvements is error handling. Instead of cryptic make errors like:

```
make: *** No rule to make target 'foo.image', needed by 'bar.image'. Stop.
```

EMB provides clear messages:

```
Error: Component 'foo' not found
  Did you mean: api, web, base?
```

## Gradual Migration

You can migrate gradually by keeping both systems during transition:

1. Start with `.emb.yml` and basic auto-discovery
2. Migrate one component at a time to `Embfile.yml`
3. Update your CI/CD scripts to use `emb` commands
4. Remove makefiles once fully migrated

## Need Help?

If you encounter issues migrating, [open an issue](https://github.com/enspirit/emb/issues) with your makefile configuration and we'll help you convert it.
