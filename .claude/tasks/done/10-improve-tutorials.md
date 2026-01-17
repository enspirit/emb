# Improve Examples & Integration Tests

## Goal

Reorganize the `examples/` folder to provide realistic monorepo examples of growing complexity, used by both integration tests and website documentation.

## What Was Done ✅

### Step 1: Create Example Monorepos
Created 4 example monorepos showcasing different EMB features:

| Example | Components | Key Features |
|---------|-----------|--------------|
| `hello-world` | 1 | Auto-discovery, minimal config |
| `fullstack-app` | 2 | docker-compose, tasks, env vars |
| `microservices` | 4 | Dependencies, build ordering, base images |
| `production-ready` | 2 | Flavors, multi-stage builds |

### Step 2a: Add Project Root Configuration
- Added `--root` / `-C` global flag to all commands
- Added `EMB_ROOT` environment variable support
- Precedence: flag > env var > find `.emb.yml`

### Step 2b: Create Test Helpers
- Created `tests/integration/helpers.ts` with:
  - `useExample(name)` - sets EMB_ROOT for non-Docker tests
  - `useExampleWithDocker(name)` - sets EMB_ROOT + Docker cleanup
  - `EXAMPLES` path constants

### Step 2c: Migrate Integration Tests
Reorganized tests by feature:
```
tests/integration/features/
├── auto-discovery/     # hello-world example
├── tasks/              # fullstack-app example
├── flavors/            # production-ready example
├── config/             # config print tests
├── build/              # microservices example (Docker)
└── docker-compose/     # fullstack-app example (Docker)
```

### Step 2d: Cleanup
- Removed old `examples/deprecated/` directory
- Removed root `.emb.yml` (no longer needed)
- Removed old test directories (`tests/integration/cli/`, `docker/`, `compose/`)
- Updated vitest workspace configuration

### Step 2e: Restore Test Coverage
All previously existing test coverage was restored:
- Autocomplete tests (bash/zsh) - skipped in CI, run manually
- Config print tests (JSON/YAML modes)
- Full Docker lifecycle (up/down/start/stop/restart/ps)
- Build operations (single, dependencies, --force, --dry-run)
- Clean command tests

### Step 3: Documentation - Multi-Tutorial Restructure ✅

Replaced the single `website/tutorial/` monorepo with a multi-tutorial structure using the `examples/` monorepos.

#### New Tutorial Structure

Created 17 tutorial pages across 4 subsections:

```
website/src/content/docs/tutorial/
├── index.md                         # Overview: learning path, prerequisites

├── hello-world/                     # THE BASICS (5 pages)
│   ├── index.md                     # What you'll learn, example overview
│   ├── 01-installation.md           # Installing EMB, prerequisites
│   ├── 02-minimal-config.md         # Creating .emb.yml, project name
│   ├── 03-auto-discovery.md         # autodocker plugin, how discovery works
│   └── 04-first-commands.md         # emb components, emb config print

├── fullstack-app/                   # TASKS & DOCKER COMPOSE (6 pages)
│   ├── index.md                     # What's new: multiple components, tasks
│   ├── 01-project-structure.md      # Multi-component setup, Embfiles
│   ├── 02-environment.md            # dotenv plugin, ${env:VAR:-default}
│   ├── 03-tasks.md                  # Project & component tasks, running them
│   ├── 04-docker-compose.md         # emb up/down/ps, service management
│   └── 05-building.md               # emb resources build, image tags

├── microservices/                   # DEPENDENCIES & SCALE (4 pages)
│   ├── index.md                     # What's new: 4 components, dependencies
│   ├── 01-base-images.md            # Shared base image pattern
│   ├── 02-dependencies.md           # Declaring & understanding dependencies
│   └── 03-build-ordering.md         # How EMB resolves build order

└── production-ready/                # FLAVORS & DEPLOYMENT (5 pages)
    ├── index.md                     # What's new: environments, multi-stage
    ├── 01-multi-stage.md            # Multi-stage Dockerfiles, targets
    ├── 02-flavors-intro.md          # What are flavors, when to use them
    ├── 03-json-patch.md             # Patch operations: replace, add, remove
    └── 04-using-flavors.md          # --flavor flag, viewing patched config
```

#### What Was Done

- [x] Created tutorial/index.md (overview page)
- [x] Created hello-world/ subsection (5 pages)
- [x] Created fullstack-app/ subsection (6 pages)
- [x] Created microservices/ subsection (4 pages)
- [x] Created production-ready/ subsection (5 pages)
- [x] Removed old tutorial pages (01-06)
- [x] Removed website/tutorial/ directory
- [x] Updated Astro sidebar with nested navigation
- [x] Updated getting-started/first-monorepo.md to use examples/
- [x] Ran validate-docs - all 35 tutorial code blocks pass

## Step 4: Documentation Cleanup (Option D) ✅

Removed redundant documentation sections that overlapped with tutorials:

### What Was Done

- [x] Removed `day-to-day/` section entirely (3 files):
  - `building-resources.md` → covered by fullstack-app/05-building.md
  - `running-services.md` → covered by fullstack-app/04-docker-compose.md
  - `managing-components.md` → covered by hello-world/03-auto-discovery.md

- [x] Removed `advanced/dependencies.md` → covered by microservices/02-dependencies.md

- [x] Refocused `advanced/tasks.md`:
  - Renamed to "Advanced Task Patterns"
  - Removed basic content covered in tutorials
  - Kept only advanced patterns: executors, interactive tasks, confirmation prompts
  - Added link to tutorial for basics

- [x] Kept `advanced/flavors.md` as JSON Patch reference

- [x] Kept `advanced/secrets.md` (Vault integration - not in tutorials)

- [x] Updated sidebar in `astro.config.mjs` to remove Day-to-Day section

- [x] Updated broken links:
  - `getting-started/first-monorepo.md` → point to advanced topics
  - `tutorial/production-ready/04-using-flavors.md` → point to advanced docs

- [x] All 35 documentation code blocks pass validation

### Final Documentation Structure

```
website/src/content/docs/
├── getting-started/     # Introduction and setup
├── tutorial/            # Learning path (4 subsections, 17 pages)
│   ├── hello-world/
│   ├── fullstack-app/
│   ├── microservices/
│   └── production-ready/
├── advanced/            # Deep dives beyond tutorials
│   ├── tasks.md         # Executors, interactive, confirmations
│   ├── flavors.md       # JSON Patch reference
│   └── secrets.md       # Vault integration
└── reference/           # Configuration schema
```

## Status: COMPLETE ✅

All tutorial restructuring and documentation cleanup is complete.
