# Task: Extend Unit Test Coverage - Phase 2

## Objective
Continue improving unit test coverage by adding tests for core functionality that is currently untested.

## Current Status
- **Unit Tests:** 319 passing (48 test files)
- **Previous Phase:** Completed Phases 1-5 ✅

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

### ✅ Phase 4: Compose Operations (COMPLETED)
- ComposeUpOperation.spec.ts (9 tests)
- ComposeDownOperation.spec.ts (6 tests)
- ComposeExecOperation.spec.ts (9 tests)
- ComposePsOperation.spec.ts (8 tests)
- ComposeRestartOperation.spec.ts (9 tests)
- ComposeStartOperation.spec.ts (8 tests)
- ComposeStopOperation.spec.ts (6 tests)

### ✅ Phase 5: Lower Priority (COMPLETED)
- GetDeploymentPodsOperation.spec.ts (7 tests)
- PodsRestartOperation.spec.ts (7 tests)
- GitPrerequisitePlugin.spec.ts (4 tests)
- FilePrerequisitePlugin.spec.ts (8 tests)
- time.spec.ts (12 tests)
- streams.spec.ts (5 tests)

## All Phases Complete! 🎉

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
