<<<<<<< Updated upstream
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
=======
# Plan

We need to clarify concepts in EMB.

## Components

For me components are logic parts of the software, they could be libraries or running parts of the architecture.
Building component requires building resources (typically docker images, but it could be files too)
Components' resources can depend on each other (an api depending on a library, a component's docker image depend on a base image, etc)

## Services

Services are running parts of the artchitecture, they might get backed by a component or not.
For instance the software might be running services considered external (out of the codebase) (postgresql, rabbitmq, ...)

## Tasks

Tasks could exist for both services or components

## Refactor

### commands

All these commands actually deal with services and not components

emb up [SERVICE...]
emb down [SERVICE...]
emb reset [SERVICE...]
emb logs [SERVICE...]
emb ps
emb restart [SERVICE...]
emb shell SERVICE
emb start [SERVICE...]
emb stop [SERVICE...]

For all of these commands we should detect when docker compose has "no configuration file provided" and give a clear error message to the user

Also, if there are no docker compose setup, all tasks should by default run locally, and trying to run with "-x container" should fail accordingly

### New commands

Additionally to the changes above we would like the following new commands:

emb services -- list services (same as ps but listing all services even if not running)
emb services start [...SERVICES] -- same as docker compose start
emb services stop [...SERVICES] -- same as docker compose stop
emb services restart [...SERVICES] -- same as docker compose restart
emb services logs [...SERVICE] -- same as emb logs 

### tasks

When running a task that does not specify a list of executors, we default to the following logic:

* Is this task belonging to a running service
    * Yes: it should run in the container by default (except if specified otherwise)
    * Is the container running?
        * Yes - then run the task
        * No - ask the user what to do with an interactive prompt: start the container and then run, or run locally
    * No: run locally

---

## Analysis Notes (Claude)

### Current State Assessment

After exploring the codebase, here's what I found:

**Current Architecture Conflation:**
- Commands like `up`, `restart`, `shell`, `logs` accept **component names** as arguments
- Internally they treat them as **docker-compose service names** (1:1 mapping assumed)
- `DockerComposeClient.isService(component)` checks if a component name matches a docker-compose service
- No concept of "external services" (postgres, rabbitmq) that aren't backed by components

**Key Files Involved:**
- `src/cli/commands/{up,down,start,stop,restart,logs,ps}.ts` - CLI commands
- `src/cli/commands/components/shell.ts` - shell command
- `src/docker/compose/client.ts` - DockerComposeClient
- `src/docker/compose/operations/*.ts` - compose operations
- `src/monorepo/operations/tasks/RunTasksOperation.ts` - task execution logic
- `src/monorepo/component.ts` - Component class
- `src/config/schema.ts` - configuration schema

**Current Task Execution Logic** (`RunTasksOperation.ts`):
```typescript
private async availableExecutorsFor(task: TaskInfo): Promise<ExecutorType[]> {
  if (task.executors) {
    return task.executors  // Use explicit config
  }
  // If task belongs to a component that's a docker-compose service
  return task.component && (await compose.isService(task.component))
    ? [ExecutorType.container, ExecutorType.local]
    : [ExecutorType.local]
}
```

### Proposed Data Model

#### Service Abstraction

We need a new `Service` concept in the configuration:

```yaml
# .emb.yml
services:
  # Service backed by a component
  api:
    component: api  # references components.api

  # External service (no component)
  postgres:
    external: true
    # Optional: define tasks that run against this service
    tasks:
      psql:
        script: psql -U postgres

  # Service with explicit docker-compose service name (if different)
  worker:
    component: background-worker
    compose:
      service: worker  # docker-compose service name if different from service name
```

Alternatively, simpler approach - services are auto-discovered from docker-compose + explicit config:

```yaml
services:
  # Override or extend auto-discovered services
  postgres:
    external: true  # marks as external (no build needed)
```

#### Component vs Service Relationship

```
Component                          Service
├── name                          ├── name
├── rootDir                       ├── component? (optional reference)
├── tasks                         ├── external? (boolean)
├── resources                     ├── tasks? (for external services)
└── flavors                       └── compose.service? (docker-compose name)
```

### Implementation Strategy

#### Phase 1: Service Discovery & Abstraction

1. **Create Service class** (`src/monorepo/service.ts`)
   - Properties: `name`, `component?`, `external`, `composeName`
   - Methods: `isRunning()`, `start()`, `stop()`, `logs()`

2. **Extend configuration schema**
   - Add optional `services` section to `.emb.yml`
   - Auto-discover services from docker-compose if not explicitly defined

3. **Update Monorepo class**
   - Add `services` getter that merges:
     - Services from docker-compose config
     - Services from `.emb.yml` services section
     - Services inferred from components (backward compat)

#### Phase 2: Command Refactoring

1. **Create ServiceCommand base class** (already started: `src/cli/abstract/ServiceCommand.ts`)
   - Common logic for service-targeting commands
   - Service resolution (by name)
   - Docker-compose availability checking
   - Clear error messages when docker-compose missing

2. **Refactor existing commands** to use ServiceCommand:
   - `up`, `down`, `start`, `stop`, `restart` - accept SERVICE names
   - `logs`, `shell` - accept SERVICE name
   - `ps` - list services

3. **Add new `services` topic commands:**
   - `emb services` - list all services (running + stopped)
   - `emb services:start [SERVICES...]`
   - `emb services:stop [SERVICES...]`
   - `emb services:restart [SERVICES...]`
   - `emb services:logs [SERVICES...]`

#### Phase 3: Task Execution Improvements

1. **Update task executor selection**:
   ```typescript
   async selectExecutor(task: TaskInfo): Promise<ExecutorType> {
     // Explicit executor specified
     if (task.executors?.length === 1) return task.executors[0]

     // Task belongs to a service?
     const service = task.component && this.monorepo.serviceForComponent(task.component)
     if (!service) return ExecutorType.local

     // Service running?
     if (await service.isRunning()) {
       return ExecutorType.container
     }

     // Prompt user
     return await this.promptExecutorChoice(task, service)
   }
   ```

2. **Add interactive prompt** when container not running:
   - Option 1: Start container, then run in container
   - Option 2: Run locally
   - Option 3: Cancel

3. **Better error handling** when no docker-compose:
   - `-x container` should fail with clear message
   - Default to local execution

#### Phase 4: Migration & Backward Compatibility

1. **Deprecation warnings** for old patterns:
   - `emb up COMPONENT` → suggest `emb up SERVICE`
   - Keep working for components that map 1:1 to services

2. **Auto-migration** where possible:
   - Infer services from components with docker-compose presence

### Breaking Changes Considerations

| Change | Impact | Mitigation |
|--------|--------|------------|
| Command args change from COMPONENT to SERVICE | Low - same names in most cases | Deprecation warnings, keep backward compat |
| New `services` config section | None - optional | Auto-discovery from docker-compose |
| Task execution prompts | Medium - CI might break | Add `--no-interactive` flag, env var |

### Open Questions

1. **Should services be defined in docker-compose or .emb.yml?**
   - Option A: Auto-discover from docker-compose, override in .emb.yml
   - Option B: Explicitly define all services in .emb.yml
   - **Recommendation**: Option A (less config, backward compat)

2. **How to handle service-to-component name mismatches?**
   - Current: assumes 1:1 name match
   - Proposed: explicit `compose.service` override or naming convention

3. **Should external services support tasks?**
   - Use case: `emb run postgres:psql` to connect to postgres
   - Would need explicit task definitions for external services

4. **What about Kubernetes services?**
   - Current codebase has k8s support
   - Should the service abstraction also cover k8s deployments?

### Suggested Implementation Order

1. [ ] Create `Service` class and basic abstraction
2. [ ] Add `services` getter to Monorepo (auto-discovery from docker-compose)
3. [ ] Create `ServiceCommand` base class with docker-compose checks
4. [ ] Implement `emb services` command (list all services)
5. [ ] Refactor `ps` to use new service abstraction
6. [ ] Add `services:start`, `services:stop`, `services:restart`, `services:logs`
7. [ ] Refactor `up`, `down`, `start`, `stop`, `restart` to use ServiceCommand
8. [ ] Update task executor selection with new logic
9. [ ] Add interactive prompts for task execution
10. [ ] Add deprecation warnings for component-as-service patterns
11. [ ] Update documentation
12. [ ] Write migration guide
>>>>>>> Stashed changes
