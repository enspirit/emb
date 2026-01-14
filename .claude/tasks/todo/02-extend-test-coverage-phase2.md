# Task: Extend Unit Test Coverage - Phase 2

## Objective
Continue improving unit test coverage by adding tests for core functionality that is currently untested.

## Current Status
- **Unit Tests:** 220 passing (35 test files)
- **Previous Phase:** Completed Phases 1-3

## Completed Phases

### ✅ Phase 1: Core Monorepo (COMPLETED)
- Component.spec.ts (15 tests)
- EMBStore.spec.ts (18 tests)
- errors.spec.ts (14 tests)

### ✅ Phase 2: Config & Validation (COMPLETED)
- validation.spec.ts (11 tests)
- context.spec.ts (3 tests)

### ✅ Phase 3: Docker Operations (COMPLETED)
- DockerComposeClient.spec.ts (3 tests - instantiation and types)
- ContainerExecOperation.spec.ts (10 tests)
- PruneContainersOperation.spec.ts (5 tests)
- BuildImageOperation.spec.ts (9 tests - instantiation and schema)
- DockerImageResource.spec.ts (12 tests)

Note: DockerComposeClient and BuildImageOperation tests are limited due to ESM mocking challenges with `execa` and `spawn`. Full behavior testing requires integration tests.

## Remaining Phases

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
