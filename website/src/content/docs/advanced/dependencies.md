---
title: Dependencies
description: Managing dependencies between resources
---

EMB automatically manages dependencies between resources, ensuring they're built in the correct order. This is essential for:

- Multi-stage builds where one image depends on another
- Generated files that must exist before building
- Cross-component dependencies

## Types of Dependencies

### Image Dependencies

One image can depend on another image:

```yaml
# dependent/Embfile.yml
resources:
  image:
    type: docker/image
    dependencies:
      - base:image
    params:
      buildArgs:
        BASE_IMAGE: emb/base:${env:DOCKER_TAG}
```

When you build `dependent`, EMB automatically builds `base:image` first.

### File Dependencies

Images can depend on generated files:

```yaml
resources:
  image:
    type: docker/image
    dependencies:
      - base:image
      - dependencies.txt
    params:
      buildArgs:
        BASE_IMAGE: emb/base:${env:DOCKER_TAG}

  dependencies.txt:
    type: file
    params:
      script: |
        echo "Generated content" > dependencies.txt
```

The `dependencies.txt` file is generated before the image is built.

## Dependency Resolution

EMB uses a directed acyclic graph (DAG) to resolve dependencies:

1. All dependencies are analyzed
2. A build order is determined
3. Resources are built in order
4. Circular dependencies are detected and rejected

### Viewing Dependencies

To see the resolved configuration with dependencies:

```shell skip cwd="../examples"
emb config print
```

This will show all components with their dependencies listed under each resource.

## Cross-Component Dependencies

Components can depend on resources from other components using the `component:resource` syntax:

```yaml
# api/Embfile.yml
resources:
  image:
    type: docker/image
    dependencies:
      - base:image  # Depends on base component's image
```

## File Resources

File resources generate files that other resources can depend on:

```yaml
resources:
  dependencies.txt:
    type: file
    params:
      script: |
        echo "Generated at $(date)" > dependencies.txt
```

The script runs in the component's directory and should create the specified file.

## Build Order Example

Given this dependency graph:

```
frontend:image
    └── (no dependencies)

api:image
    └── base:image

worker:image
    ├── base:image
    └── api:image
```

EMB will build in this order (one at a time):
1. `base:image` (no dependencies)
2. `frontend:image` (no dependencies)
3. `api:image` (depends on base)
4. `worker:image` (depends on both base and api)

## Circular Dependency Detection

EMB detects and rejects circular dependencies:

```yaml
# This will fail!
# a/Embfile.yml
resources:
  image:
    dependencies:
      - b:image

# b/Embfile.yml
resources:
  image:
    dependencies:
      - a:image
```

EMB will report an error explaining the circular dependency.

## Best Practices

1. **Keep dependencies explicit** - Always declare dependencies, even if they seem obvious
2. **Use base images** - Create a `base` component for shared dependencies
3. **Minimize cross-component dependencies** - Too many dependencies slow down builds
4. **Use file resources for generated content** - Don't generate files in Dockerfiles if they can be pre-generated
