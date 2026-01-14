# Unit Test Coverage Extension Plan

## Summary
Add unit tests for 10 untested source files across three areas: Monorepo Operations (5), Plugins (2), and Resource Builders (3).

## Test Files to Create

### Phase 1: Simple (Foundation)

**1. `tests/unit/monorepo/resources/ResourceFactory.spec.ts`**
- Source: `src/monorepo/resources/ResourceFactory.ts`
- Tests: register(), factor(), duplicate registration error, unknown type error
- Mocking: None (test static registry with cleanup between tests)

**2. `tests/unit/monorepo/plugins/DotEnvPlugin.spec.ts`**
- Source: `src/monorepo/plugins/DotEnvPlugin.ts`
- Tests: init() calls configDotenv, path resolution via monorepo.join(), multiple files
- Mocking: `vi.mock('dotenv')`

**3. `tests/unit/monorepo/resources/FileResourceBuilder.spec.ts`**
- Source: `src/monorepo/resources/FileResourceBuilder.ts`
- Tests: getReference(), getPath(), mustBuild() (file exists/missing), build() returns operation
- Mocking: `vi.mock('node:fs/promises')` for statfs

**4. `tests/unit/monorepo/operations/components/GetComponentContainerOperation.spec.ts`**
- Source: `src/monorepo/operations/components/GetComponentContainerOperation.ts`
- Tests: find single container, no container error, multiple containers error, accepts Component or string
- Mocking: Uses global context, mock ListContainersOperation results

### Phase 2: Medium Complexity

**5. `tests/unit/monorepo/operations/shell/ExecuteLocalCommandOperation.spec.ts`**
- Source: `src/monorepo/operations/shell/ExecuteLocalCommandOperation.ts`
- Tests: script execution, env variables, workingDir, interactive vs non-interactive mode, stream piping
- Mocking: `vi.mock('execa')`

**6. `tests/unit/monorepo/operations/fs/CreateFileOperation.spec.ts`**
- Source: `src/monorepo/operations/fs/CreateFileOperation.ts`
- Tests: file exists (skip), file missing (create), force updates timestamps, script execution
- Mocking: `vi.mock('node:fs/promises')`, `vi.mock('execa')`

**7. `tests/unit/monorepo/plugins/EmbfileLoaderPlugin.spec.ts`**
- Source: `src/monorepo/plugins/EmbfileLoaderPlugin.ts`
- Tests: default glob pattern, custom glob, no embfiles, single/multiple embfiles, merge with existing
- Mocking: `vi.mock('glob')`, `vi.mock('@/config')` for validateEmbfile

**8. `tests/unit/monorepo/resources/abstract/SentinelFileBasedBuilder.spec.ts`**
- Source: `src/monorepo/resources/abstract/SentinelFileBasedBuilder.ts`
- Tests: mustBuild() with no sentinel (first build), cache hit (skip), cache miss (rebuild), readSentinel(), storeSentinelData()
- Mocking: Mock monorepo.store (stat, readFile, writeFile)

### Phase 3: Complex

**9. `tests/unit/monorepo/operations/resources/BuildResourcesOperation.spec.ts`**
- Source: `src/monorepo/operations/resources/BuildResourcesOperation.ts`
- Tests: single/multiple resources, dependency ordering, cache hit/miss, dry run, force rebuild, builder integration
- Mocking: ResourceFactory.factor(), Listr2 task manager

**10. `tests/unit/monorepo/operations/tasks/RunTasksOperation.spec.ts`**
- Source: `src/monorepo/operations/tasks/RunTasksOperation.ts`
- Tests: task resolution by ID/name, executor selection (local/container), local execution, container execution, confirmation prompts
- Mocking: ExecuteLocalCommandOperation, ContainerExecOperation, inquirer prompts, compose client

## Test Pattern Reference

```typescript
// Standard structure (from existing tests)
import { beforeEach, describe, expect, test, vi, Mock } from 'vitest';
import { getContext, EmbContext } from '@';

describe('Module / ClassName', () => {
  let context: EmbContext;

  beforeEach(() => {
    context = getContext();
  });

  describe('#methodName()', () => {
    test('it does something', async () => {
      // Arrange, Act, Assert
    });
  });
});
```

## Verification

After implementation, run:
```bash
npm run test:unit                    # All unit tests pass
npx vitest run tests/unit/monorepo/  # New tests specifically
npm run lint                         # No lint errors
```
