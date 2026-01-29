# Kubernetes Task Executor

## Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Core Infrastructure (schema, operations) | **DONE** |
| 2 | Integration (RunTasksOperation, CLI) | **DONE** |
| 3 | Polish (error handling, interactive mode) | **DONE** |
| 4 | Testing & Documentation | **DONE** |

## Goal

Implement a Kubernetes executor for EMB tasks, enabling tasks to run on pods in a deployed Kubernetes namespace. This completes the execution trifecta:

| Executor    | Where it runs                     | Use case                        |
|-------------|-----------------------------------|----------------------------------|
| `local`     | Host machine                      | Development, scripts            |
| `container` | Docker Compose service container  | Local containerized dev/test    |
| `kubernetes`| Pod in K8s namespace              | Staging/production environments |

## Current Architecture

### Task Configuration
```yaml
tasks:
  migrate:
    script: npx prisma migrate deploy
    executor: container           # or "local"
    executors: [container, local] # priority order
```

### Executor Selection Flow
1. `RunTasksOperation.availableExecutorsFor()` determines valid executors per task
2. CLI flag `--executor` or config `executor` selects which to use
3. `RunTasksOperation.executeTask()` dispatches to:
   - `ExecuteLocalCommandOperation` for `local`
   - `ContainerExecOperation` for `container`

### Existing Kubernetes Infrastructure
- `KubernetesClient` with CoreV1Api, AppsV1Api (`src/kubernetes/client.ts`)
- `GetDeploymentPodsOperation` - lists pods by deployment
- `PodsRestartOperation` - restarts deployments
- Client already in `EmbContext`

## Design Decisions

### 1. Target Pod Selection

**Question**: How do we identify which pod to exec into for a component?

**Decision**: Deployment name matching component name.

Assumes 1:1 mapping between components, Docker Compose services, and Kubernetes deployment names. This keeps things simple and consistent across all execution environments.

### 2. Namespace Configuration

**Decision**: Support multiple sources with precedence: CLI > env > flavor > config > "default"

- **CLI flag**: `emb run migrate -x kubernetes --namespace staging`
- **Environment variable**: `K8S_NAMESPACE`
- **Config file**:
  ```yaml
  kubernetes:
    namespace: ${env:K8S_NAMESPACE:-default}
  ```
- **Flavor-based**:
  ```yaml
  flavors:
    staging:
      patch:
        - op: add
          path: /kubernetes/namespace
          value: staging
  ```

### 3. Container Selection (Multi-container Pods)

When a pod has multiple containers, we need to know which one to exec into.

**Decision**: Require explicit config for multi-container pods, fallback to first container for single-container pods.

- Single-container pod: use that container (kubectl default behavior)
- Multi-container pod: require explicit `container` config, error if not specified

### 4. Pod Selection (Multiple Replicas)

When a deployment has multiple pods, which one runs the task?

**Decision**: First ready pod. Keep it simple for v1.

## Implementation Plan

### Phase 1: Core Infrastructure

#### 1.1 Schema Updates (`src/config/schema.ts`)

Add `kubernetes` to executor types:
```typescript
export const ExecutorTypeSchema = z.enum(["local", "container", "kubernetes"]);
```

Add Kubernetes config section:
```typescript
export const KubernetesConfigSchema = z.object({
  namespace: z.string().optional(),
  context: z.string().optional(), // kubeconfig context
}).optional();

export const ComponentKubernetesSchema = z.object({
  container: z.string().optional(),     // container name for multi-container pods
  deployment: z.string().optional(),    // deployment name if different from component
}).optional();
```

#### 1.2 Kubernetes Exec Operation (`src/kubernetes/operations/PodExecOperation.ts`)

New operation for executing commands in pods:

```typescript
interface PodExecInput {
  namespace: string;
  podName: string;
  container?: string;
  script: string;
  env?: Record<string, string>;
  interactive?: boolean;
  tty?: boolean;
  workingDir?: string;
}

interface PodExecOutput {
  exitCode: number;
  stdout?: string;
  stderr?: string;
}
```

Implementation uses `@kubernetes/client-node` exec API:
```typescript
const exec = new Exec(kubeConfig);
await exec.exec(namespace, podName, container, command, stdout, stderr, stdin, tty);
```

#### 1.3 Get Component Pod Operation (`src/kubernetes/operations/GetComponentPodOperation.ts`)

Resolve a component to a target pod:

```typescript
interface GetComponentPodInput {
  component: Component;
  namespace: string;
}

interface GetComponentPodOutput {
  pod: V1Pod;
  container: string;
}
```

Logic:
1. Get deployment name from component config or use component name
2. List pods belonging to that deployment in namespace
3. Filter to ready pods
4. Return first ready pod
5. For container: use explicit config if set, else error if multi-container, else use first container

### Phase 2: Integration

#### 2.1 Update RunTasksOperation (`src/monorepo/operations/tasks/RunTasksOperation.ts`)

Extend `availableExecutorsFor()`:
```typescript
private availableExecutorsFor(task: Task): ExecutorType[] {
  if (task.executors) return task.executors;

  const available: ExecutorType[] = ["local"];

  if (task.component && await this.isDockerService(task.component)) {
    available.push("container");
  }

  if (task.component && await this.hasKubernetesDeployment(task.component)) {
    available.push("kubernetes");
  }

  return available;
}
```

Extend `executeTask()`:
```typescript
case "kubernetes": {
  const { pod, container } = await monorepo.run(
    new GetComponentPodOperation(),
    { component: task.component, namespace }
  );

  return monorepo.run(new PodExecOperation(), {
    namespace,
    podName: pod.metadata.name,
    container,
    script: task.script,
    env: expandedVars,
    interactive: task.interactive,
    workingDir: task.workingDir,
  });
}
```

#### 2.2 CLI Updates (`src/cli/commands/tasks/run.ts`)

Add flags:
```typescript
static flags = {
  executor: Flags.string({
    char: 'x',
    options: ['local', 'container', 'kubernetes'],
  }),
  namespace: Flags.string({
    char: 'n',
    description: 'Kubernetes namespace for kubernetes executor',
  }),
  context: Flags.string({
    description: 'Kubernetes context to use',
  }),
}
```

#### 2.3 Namespace Resolution

Create utility for namespace resolution:
```typescript
// src/kubernetes/utils/resolveNamespace.ts
export function resolveNamespace(options: {
  cliFlag?: string;
  config?: string;
}): string {
  return options.cliFlag
    ?? process.env.K8S_NAMESPACE
    ?? options.config
    ?? 'default';
}
```

### Phase 3: Polish & Edge Cases

#### 3.1 Error Handling

- Pod not found → helpful error with label selector used
- No ready pods → suggest checking deployment status
- Container not found → list available containers
- Namespace not found → suggest available namespaces
- Auth errors → suggest `kubectl auth can-i`

#### 3.2 Interactive Mode

Kubernetes exec supports TTY allocation. Handle:
- Terminal resize events (SIGWINCH)
- Clean disconnect on Ctrl+C
- Proper exit code propagation

#### 3.3 Streaming Output

Match Docker executor behavior:
- Stream stdout/stderr in real-time
- Log to file for persistence
- Support Listr2 output mode

### Phase 4: Testing

#### 4.1 Unit Tests
- Schema validation for new fields
- Namespace resolution logic
- Pod selection logic (mocked K8s API)

#### 4.2 Integration Tests
- Requires running K8s cluster (kind/minikube)
- Test exec in single-container pod
- Test exec in multi-container pod
- Test interactive mode
- Test error scenarios

#### 4.3 Example Project
Add Kubernetes manifests to `examples/production-ready/`:
```
k8s/
  namespace.yaml
  api-deployment.yaml
  web-deployment.yaml
```

## File Changes Summary

### New Files
- `src/kubernetes/operations/PodExecOperation.ts`
- `src/kubernetes/operations/GetComponentPodOperation.ts`
- `src/kubernetes/utils/resolveNamespace.ts`
- `tests/unit/kubernetes/operations/PodExecOperation.spec.ts`
- `tests/unit/kubernetes/operations/GetComponentPodOperation.spec.ts`

### Modified Files
- `src/config/schema.ts` - Add kubernetes executor type and config schemas
- `src/config/zod/schema.ts` - Generated from schema.ts
- `src/monorepo/operations/tasks/RunTasksOperation.ts` - Add kubernetes execution path
- `src/cli/commands/tasks/run.ts` - Add namespace/context flags
- `src/kubernetes/client.ts` - Add Exec client
- `src/types.ts` - Update ExecutorType if defined there

## Open Questions

1. **Workdir handling**: Kubernetes exec doesn't have native workdir support. Options:
   - Wrap script in `cd {dir} && {script}`
   - Require container images to set WORKDIR

2. **File mounting**: Tasks might need files from the repo. Options:
   - Assume files are baked into image
   - Use `kubectl cp` before exec
   - Out of scope for v1

3. **Service account permissions**: What RBAC does EMB need? Document requirements.

## Success Criteria

- [ ] `emb run migrate -x kubernetes -n staging` executes migrate task in staging pod
- [ ] Interactive tasks work with TTY
- [ ] Output streaming matches Docker executor UX
- [ ] Clear error messages for common failure modes
- [ ] Documentation in website
- [ ] Example in `examples/production-ready`
