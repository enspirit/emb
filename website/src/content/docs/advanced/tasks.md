---
title: Advanced Task Patterns
description: Executors, interactive tasks, and confirmation prompts
---

This guide covers advanced task patterns. For task basics (defining, running, variables, prerequisites), see the [Tasks tutorial](/emb/tutorial/fullstack-app/03-tasks/).

## Executors

By default, component tasks run inside the component's container. You can change this with the `executors` option:

```yaml
tasks:
  inspect:
    executors:
      - local
    script: |
      echo "This runs on your machine, not in a container"
```

Available executors:
- `local` - Run on your local machine
- `container` - Run inside the component's Docker container (default for component tasks)
- `kubernetes` - Run on a pod in your Kubernetes cluster (see [Kubernetes Integration](/emb/advanced/kubernetes/))

### When to Use Local Executors

Use `local` when your task needs to:
- Access files outside the container
- Run commands not available in the container
- Interact with the host system (e.g., opening browsers)

```yaml
tasks:
  open-docs:
    executors:
      - local
    script: |
      open http://localhost:3000/docs
```

## Interactive Tasks

For tasks that need user input (like `sudo` or interactive CLIs), mark them as interactive:

```yaml
tasks:
  sudo:
    interactive: true
    executors:
      - local
    script: |
      sudo ls -la
```

The `interactive: true` flag ensures:
- stdin is connected to the terminal
- The task can receive keyboard input
- TTY-dependent commands work correctly

### Common Use Cases

```yaml
tasks:
  # Database shell
  db-shell:
    interactive: true
    script: |
      psql $DATABASE_URL

  # Interactive rebase
  rebase:
    interactive: true
    executors:
      - local
    script: |
      git rebase -i main
```

## Confirmation Prompts

Require user confirmation before running potentially dangerous tasks:

```yaml
tasks:
  deploy:
    vars:
      ENV: ${env:DEPLOY_ENV:-staging}
    confirm:
      message: "Deploy to $ENV?"
      expect: ${ENV}
    script: |
      echo "Deploying to $ENV..."
```

The user must type the expected value to proceed:

```
Deploy to production?
Type 'production' to confirm: production
Deploying to production...
```

### Confirmation Options

- `message` - The prompt shown to the user
- `expect` - The exact text the user must type (supports variable expansion)

This is useful for:
- Production deployments
- Destructive operations (e.g., database resets)
- Operations that incur costs

```yaml
tasks:
  reset-db:
    confirm:
      message: "This will DELETE ALL DATA. Are you sure?"
      expect: "yes-delete-everything"
    script: |
      dropdb myapp && createdb myapp
```

## Combining Patterns

You can combine these patterns:

```yaml
tasks:
  production-shell:
    description: Open a shell on production (dangerous!)
    interactive: true
    executors:
      - local
    confirm:
      message: "Connect to PRODUCTION database?"
      expect: "production"
    script: |
      heroku pg:psql --app myapp-production
```

This task:
1. Requires typing "production" to confirm
2. Runs locally (not in container)
3. Connects stdin for the interactive psql session
