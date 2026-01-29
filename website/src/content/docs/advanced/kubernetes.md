---
title: Kubernetes Integration
description: Running tasks on Kubernetes pods and managing deployments
---

EMB provides native Kubernetes integration, allowing you to run tasks directly on pods in your cluster and manage deployments.

## Kubernetes Executor

The `kubernetes` executor runs tasks on pods in your Kubernetes cluster, complementing the `local` and `container` (Docker Compose) executors.

```yaml
tasks:
  migrate:
    script: npm run migrate
    executors:
      - kubernetes
```

### When to Use Kubernetes Executor

Use the `kubernetes` executor when you need to:

- Run tasks on a deployed instance of your application
- Execute database migrations on production/staging environments
- Debug issues in a running cluster
- Run one-off commands without local setup

```yaml
tasks:
  db-migrate:
    description: Run database migrations on the cluster
    executors:
      - kubernetes
    script: npm run migrate

  console:
    description: Open Rails console on production
    interactive: true
    executors:
      - kubernetes
    script: rails console
```

### Running Tasks with Kubernetes

Use the `--executor` flag to run tasks on Kubernetes:

```shell
# Run migration on the cluster
emb run db-migrate --executor kubernetes
```

## Configuration

### Project-Level Defaults

Configure Kubernetes defaults in your `.emb.yml`:

```yaml
defaults:
  kubernetes:
    namespace: staging                           # Default namespace
    selectorLabel: app.kubernetes.io/component   # Label for pod selection (default)
```

### Component Configuration

Override settings per component:

```yaml
# api/Embfile.yml
kubernetes:
  selector: app=api,tier=backend   # Custom label selector
  container: main                   # For multi-container pods
```

### Configuration Options

#### Project Level (`defaults.kubernetes`)

| Option | Description | Default |
|--------|-------------|---------|
| `namespace` | Default Kubernetes namespace | `default` |
| `selectorLabel` | Label name used to find component pods | `app.kubernetes.io/component` |

#### Component Level (`kubernetes`)

| Option | Description |
|--------|-------------|
| `selector` | Custom label selector (e.g., `app=api,env=prod`) |
| `container` | Container name for multi-container pods |

## Namespace Resolution

EMB resolves the namespace in this order of precedence:

1. Environment variable: `K8S_NAMESPACE`
2. Configuration: `defaults.kubernetes.namespace`
3. Default: `default`

```shell
# Set environment variable
export K8S_NAMESPACE=production
emb run migrate --executor kubernetes

# Or configure in .emb.yml
# defaults:
#   kubernetes:
#     namespace: production
```

## Pod Selection

By default, EMB finds pods using the label `app.kubernetes.io/component={component-name}`:

```shell
# For component "api", EMB looks for pods with:
# app.kubernetes.io/component=api
```

### Custom Label Selector

If your pods use different labels, configure a custom selector:

```yaml
# Component with custom selector
kubernetes:
  selector: app=my-api,environment=production
```

### Custom Selector Label

To change the default label name project-wide:

```yaml
# .emb.yml
defaults:
  kubernetes:
    selectorLabel: app   # Now uses: app={component-name}
```

## Multi-Container Pods

For pods with multiple containers (sidecars, init containers, etc.), specify which container to use:

```yaml
# worker/Embfile.yml
kubernetes:
  container: main   # Execute in the 'main' container, not the sidecar
```

If not specified and the pod has multiple containers, EMB will error with a helpful message listing available containers.

## Kubernetes Commands

EMB provides commands for interacting with your Kubernetes deployments:

### emb kubernetes shell

Open a shell in a running pod:

```shell
emb kubernetes shell <COMPONENT> [OPTIONS]
```

**Options:**
- `-n, --namespace <name>` - Target namespace
- `-s, --shell <shell>` - Shell to use (default: `/bin/sh`)

**Examples:**
```shell
emb kubernetes shell api
emb kubernetes shell api --namespace production
emb kubernetes shell api --shell /bin/bash
```

### emb kubernetes logs

View logs from pods:

```shell
emb kubernetes logs <COMPONENT> [OPTIONS]
```

**Options:**
- `-n, --namespace <name>` - Target namespace
- `-f, --follow` - Follow log output
- `--tail <lines>` - Number of lines to show

**Examples:**
```shell
emb kubernetes logs api
emb kubernetes logs api --follow
emb kubernetes logs api --namespace production --tail 100
```

### emb kubernetes ps

List pods for a deployment:

```shell
emb kubernetes ps <COMPONENT> [OPTIONS]
```

**Options:**
- `-n, --namespace <name>` - Target namespace

### emb kubernetes restart

Restart pods for a deployment:

```shell
emb kubernetes restart <COMPONENT> [OPTIONS]
```

**Options:**
- `-n, --namespace <name>` - Target namespace

## Interactive Tasks

For tasks requiring user input, mark them as interactive:

```yaml
tasks:
  console:
    description: Open application console
    interactive: true
    executors:
      - kubernetes
    script: rails console
```

This ensures:
- TTY is allocated for the pod exec
- stdin is connected for interactive input
- SIGINT (Ctrl+C) is properly handled

## Example: Full Configuration

```yaml
# .emb.yml
project:
  name: myapp

defaults:
  kubernetes:
    namespace: ${env:K8S_NAMESPACE:-staging}
    selectorLabel: app.kubernetes.io/component

components:
  api:
    kubernetes:
      container: app   # Multi-container pod
    tasks:
      migrate:
        description: Run database migrations
        executors:
          - kubernetes
        script: npm run db:migrate

      console:
        description: Open Rails console
        interactive: true
        executors:
          - kubernetes
        script: rails console

  worker:
    kubernetes:
      selector: app=worker,tier=background
    tasks:
      process:
        description: Process pending jobs
        executors:
          - kubernetes
        script: npm run jobs:process
```

## Troubleshooting

### No ready pods found

```
Error: No ready pods found for component "api" in namespace "production"
```

**Solutions:**
- Check pod status: `kubectl get pods -n production -l app.kubernetes.io/component=api`
- Verify the label selector matches your pod labels
- Ensure pods are in Ready state

### Multiple containers error

```
Error: Pod "api-xyz" has multiple containers, explicit container config required
```

**Solution:** Add `container` to your component's kubernetes config:

```yaml
kubernetes:
  container: main
```

### Container not found

```
Error: Container "main" not found in pod "api-xyz"
```

**Solution:** Check available containers and update your config:

```shell
kubectl get pod api-xyz -o jsonpath='{.spec.containers[*].name}'
```
