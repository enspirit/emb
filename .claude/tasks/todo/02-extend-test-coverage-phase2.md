# Task: Extend Unit Test Coverage - Phase 2

## Objective
Continue improving unit test coverage by adding tests for core functionality that is currently untested.

## Current Status
- **Unit Tests:** 120 passing (25 test files)
- **Previous Phase:** Completed tests for operations, plugins, resources, and utilities

## Priority Areas

### Phase 1: Core Monorepo (Simple)

| File | Location | Estimated Tests |
|------|----------|-----------------|
| Component | `src/monorepo/component.ts` | 6 tests |
| EMBStore | `src/monorepo/store/index.ts` | 8 tests |
| Errors | `src/errors.ts` | 5 tests |

**Component.ts tests should cover:**
- Constructor initialization (name, config, resources, tasks, flavors)
- `rootDir` getter (default vs custom)
- `flavor()` method (existing and missing flavors)
- `cloneWith()` method
- `withFlavor()` method applying patches
- `join()` and `relative()` path helpers

**EMBStore tests should cover:**
- `init()` creates store directory
- `join()` builds correct paths with flavor
- `writeFile()` and `readFile()` round-trip
- `stat()` with mustExist flag
- `createWriteStream()` and `createReadStream()`
- `trash()` removes store directory
- `mkdirp()` creates nested directories

**Errors tests should cover:**
- EMBError base class
- CliError with suggestions
- AmbiguousReferenceError
- CircularDependencyError
- UnknownReferenceError

### Phase 2: Config & Validation (Medium)

| File | Location | Estimated Tests |
|------|----------|-----------------|
| Validation | `src/config/validation.ts` | 6 tests |
| Context | `src/context.ts` | 3 tests |

### Phase 3: Docker Operations (Medium-Complex)

| File | Location | Estimated Tests |
|------|----------|-----------------|
| DockerComposeClient | `src/docker/compose/client.ts` | 8 tests |
| ContainerExecOperation | `src/docker/operations/containers/ContainerExecOperation.ts` | 4 tests |
| PruneContainersOperation | `src/docker/operations/containers/PruneContainersOperation.ts` | 3 tests |
| BuildImageOperation | `src/docker/operations/images/BuildImageOperation.ts` | 5 tests |
| DockerImageResource | `src/docker/resources/DockerImageResource.ts` | 6 tests |

### Phase 4: Compose Operations (Requires Docker mocking)

| File | Location | Estimated Tests |
|------|----------|-----------------|
| ComposeUpOperation | `src/docker/compose/operations/ComposeUpOperation.ts` | 4 tests |
| ComposeDownOperation | `src/docker/compose/operations/ComposeDownOperation.ts` | 3 tests |
| ComposeExecOperation | `src/docker/compose/operations/ComposeExecOperation.ts` | 4 tests |
| ComposePsOperation | `src/docker/compose/operations/ComposePsOperation.ts` | 3 tests |
| ComposeRestartOperation | `src/docker/compose/operations/ComposeRestartOperation.ts` | 3 tests |
| ComposeStartOperation | `src/docker/compose/operations/ComposeStartOperation.ts` | 3 tests |
| ComposeStopOperation | `src/docker/compose/operations/ComposeStopOperation.ts` | 3 tests |

### Phase 5: Lower Priority

| File | Location | Estimated Tests |
|------|----------|-----------------|
| Kubernetes operations | `src/kubernetes/operations/*.ts` | 6 tests |
| Prerequisite plugins | `src/prerequisites/*.ts` | 4 tests |
| Utility functions | `src/utils/streams.ts`, `src/utils/time.ts` | 4 tests |

## Test Patterns to Follow

### For Store/FileSystem tests:
```typescript
let tempDir: string;
beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'embTest'));
});
afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});
```

### For Docker-dependent tests:
```typescript
const mockDocker = vi.mockObject(new Dockerode());
// or use vi.spyOn to mock specific methods
```

### For Context-dependent operations:
```typescript
setContext({
  docker: vi.mockObject(new Dockerode()),
  kubernetes: vi.mockObject(createKubernetesClient()),
  monorepo: repo,
  compose: mockCompose,
});
```

## Success Criteria
- All new tests pass
- No lint errors
- Tests follow existing patterns in the codebase
- Each test file has clear describe/test structure

## Notes
- Docker/Compose operations will require careful mocking of external commands
- Consider using `vi.spyOn` for partial mocking of classes
- Integration tests already cover CLI commands, so unit tests should focus on operation logic
