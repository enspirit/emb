# Components vs Services: Supporting External Docker Services

## Problem Statement

Currently, EMB commands like `emb restart`, `emb logs`, `emb up`, etc. only work with **components** - entities that EMB manages and that typically have:
- A directory with source code
- A `Dockerfile`
- An optional `Embfile.yml`

However, real-world monorepos often include **external services** in their `docker-compose.yml` that are not EMB components:
- Databases (PostgreSQL, MySQL, MongoDB)
- Caches (Redis, Memcached)
- Message queues (RabbitMQ, Kafka)
- Other infrastructure (Elasticsearch, MinIO, etc.)

These services use pre-built images from Docker Hub and don't have associated source code or Dockerfiles in the monorepo.

**Current behavior:**
```bash
emb restart api                  # Works - api is a component
emb restart db                   # Fails - db is just a docker-compose service
```

## Terminology Clarification

| Term | Definition |
|------|------------|
| **Component** | An EMB-managed entity with source code, Dockerfile, and optional Embfile.yml |
| **Service** | A docker-compose service (may or may not be backed by a component) |
| **External Service** | A docker-compose service that is NOT backed by an EMB component |

Note: Every component has a corresponding docker-compose service, but not every service is a component.

## Use Cases

1. **Restart database during development**: `emb restart db`
2. **View database logs**: `emb logs db`
3. **Stop all infrastructure**: `emb stop db redis elasticsearch`
4. **Mixed operations**: `emb restart api db` (one component, one external service)

## Design Options

### Option A: Implicit Service Fallback

When a name doesn't match a component, automatically fall back to treating it as a docker-compose service.

```bash
emb restart api    # Matches component "api" → use component logic
emb restart db     # No component "db" → fall back to docker-compose service
```

**Pros:**
- Zero configuration needed
- Intuitive UX - "it just works"
- Backwards compatible

**Cons:**
- Implicit behavior can be surprising
- Typos in component names silently become service operations
- No way to distinguish intentional service operations from typos

### Option B: Explicit Service Flag

Add a `--service` or `-s` flag to indicate operating on a docker-compose service rather than a component.

```bash
emb restart api           # Component operation
emb restart -s db         # Service operation (explicit)
emb restart api -s db     # Mixed: component + service
```

**Pros:**
- Explicit intent, no ambiguity
- Typos in component names fail loudly
- Clear distinction in scripts and documentation

**Cons:**
- More verbose for common operations
- Users must remember the flag

### Option C: Declare External Services in Configuration

Allow declaring external services in `.emb.yml` so EMB is aware of them:

```yaml
services:
  db:
    type: external
    description: PostgreSQL database
  redis:
    type: external
    description: Redis cache
```

Then `emb restart db` works because `db` is a known entity.

**Pros:**
- EMB has full knowledge of the project topology
- Can add metadata (description, dependencies, health checks)
- Services appear in `emb status`, `emb components`, etc.
- Could support service-specific tasks in the future

**Cons:**
- Requires configuration (duplication with docker-compose.yml)
- Need to keep in sync with docker-compose.yml

### Option D: Auto-discover Services from docker-compose.yml

Parse `docker-compose.yml` to discover all services, then distinguish components from external services automatically.

```bash
emb services          # List all services (components + external)
emb components        # List only components
emb restart db        # Works - discovered from docker-compose.yml
```

**Pros:**
- Zero configuration
- Always in sync with docker-compose.yml
- Full visibility into project topology

**Cons:**
- Parsing docker-compose.yml adds complexity
- Need to handle multiple compose files, overrides, etc.
- May discover services user doesn't want EMB to manage

### Option E: Hybrid Approach (Recommended?)

Combine auto-discovery with optional explicit configuration:

1. **Auto-discover** all services from docker-compose.yml
2. **Auto-detect** which services are components (have matching directory with Dockerfile)
3. **Allow override** in `.emb.yml` for special cases

```yaml
# Optional: customize discovered services
services:
  db:
    description: PostgreSQL database
    # EMB auto-detected this is external (no Dockerfile)
  legacy-api:
    type: external  # Force external even if directory exists
```

Commands would work on any discovered service:
```bash
emb restart api       # Component (auto-detected)
emb restart db        # External service (auto-detected)
emb services          # List all
emb services --external  # List only external services
```

## Impact on Existing Commands

Commands that would need to support services:

| Command | Current | With Services |
|---------|---------|---------------|
| `emb up` | Components only | All services |
| `emb down` | Components only | All services |
| `emb restart` | Components only | All services |
| `emb logs` | Components only | All services |
| `emb status` | Components only | All services |
| `emb exec` | Components only | All services |

Commands that remain component-only (require source code):

| Command | Reason |
|---------|--------|
| `emb build` | Needs Dockerfile |
| `emb resources build` | Needs Dockerfile |
| `emb tasks` | Tasks defined in Embfile.yml |

## Questions to Resolve

1. **Naming**: Should we call them "services", "external services", "infrastructure", or something else?

2. **Scope**: Should EMB manage ALL docker-compose services or only explicitly marked ones?

3. **Default behavior**: When user types `emb restart foo` and `foo` doesn't exist as component or service, should we:
   - Error immediately?
   - Try docker-compose anyway (let it fail)?
   - Suggest similar names?

4. **UI representation**: How should external services appear in:
   - `emb status` output?
   - `emb components` (rename to `emb services`?)
   - Autocompletion?

5. **Task support**: Should external services support tasks? E.g., `db:reset` that runs `psql` commands?

## Implementation Sketch

### Phase 1: Basic Service Support
- Parse docker-compose.yml to discover services
- Mark services as "component" or "external" based on Dockerfile presence
- Update `restart`, `logs`, `up`, `down`, `stop` to work with any service

### Phase 2: Configuration & UI
- Add `services` section to `.emb.yml` for metadata
- Update `emb status` to show all services
- Add `emb services` command

### Phase 3: Advanced Features
- Service-level tasks (e.g., `db:reset`, `db:seed`)
- Service dependencies in configuration
- Health check integration

## Related

- Docker Compose service model
- Kubernetes distinction between Deployments and StatefulSets
- Terraform's managed vs data resources
