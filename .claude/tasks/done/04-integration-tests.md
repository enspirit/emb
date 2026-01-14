# Problem to solve

I'd like to extend the integration tests to test more of the CLI itself, let's find how we can extend them and also make them more robust by cleaning up before the whole test suite, and after (especially after crashes).

it would be good to have beforeAll/tearDown hooks that use emb itself to run the clean.

---

# Progress

## Completed

### Phase 1: Test Infrastructure (Done)

- [x] Created `vitest.workspace.ts` to separate test environments:
  - `unit` - Unit tests with mocked context
  - `integration-mocked` - Existing CLI tests with mocked Docker
  - `integration-docker` - Real Docker tests (sequential execution)
  - `integration-compose` - Docker Compose operation tests
- [x] Created `tests/integration/docker/global-setup.ts` - Runs `emb clean --force` before all Docker tests (crash recovery)
- [x] Created `tests/integration/docker/setup.ts` with `useRealDocker()` hook providing:
  - `beforeAll`: Clean state before tests
  - `afterAll`: Cleanup after all tests
  - `afterEach`: Run `emb down` between tests

### Phase 2: Package Scripts (Done)

Updated `package.json` with new test scripts:
- `test:unit` - Run unit tests only
- `test:integration` - Run mocked + Docker integration tests
- `test:integration:mocked` - Run mocked CLI tests only
- `test:integration:docker` - Run real Docker tests only

### Phase 3: Docker Integration Tests (Done)

Created new test files in `tests/integration/docker/`:
- [x] `build.spec.ts` - Tests for `emb resources build` with real Docker
- [x] `up-down.spec.ts` - Tests for `emb up` and `emb down` lifecycle
- [x] `clean.spec.ts` - Tests for `emb clean` command
- [x] `ps.spec.ts` - Tests for `emb ps` command
- [x] `lifecycle.spec.ts` - Full lifecycle tests (build → up → stop → start → restart → down)

### Phase 4: Compose Operation Tests (Done)

Created new test files in `tests/integration/compose/`:
- [x] `start-stop.spec.ts` - Tests for start/stop operations
- [x] `restart.spec.ts` - Tests for restart operations

### Phase 5: CI Workflow (Done)

Updated `.github/workflows/ci.yml` to run tests in separate steps:
1. Run unit tests
2. Run mocked integration tests
3. Run Docker integration tests

---

## Test Summary

- **Unit tests**: 319 tests (48 files)
- **Mocked integration tests**: 11 tests (4 files)
- **Docker integration tests**: 22 tests (7 files)

Total: 352 tests

---

## Architecture

```
tests/
  setup/
    set.context.ts           # Existing: mocked context for fast tests
  integration/
    cli/commands/            # Existing mocked CLI tests
    docker/                  # NEW: Real Docker integration tests
      global-setup.ts        # Runs `emb clean` before/after suite
      setup.ts               # Shared hooks (useRealDocker)
      build.spec.ts
      up-down.spec.ts
      clean.spec.ts
      ps.spec.ts
      lifecycle.spec.ts
    compose/                 # NEW: Compose operation tests
      start-stop.spec.ts
      restart.spec.ts
```

---

## Status: Complete

All phases completed. The integration tests now:
1. Test real Docker operations (build, up, down, stop, start, restart, clean, ps)
2. Use EMB's own cleanup commands for robust test lifecycle
3. Handle crash recovery by running cleanup at test suite start
4. Run sequentially to avoid Docker conflicts
