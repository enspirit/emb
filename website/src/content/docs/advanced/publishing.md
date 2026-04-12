---
title: Publishing Resources
description: Pushing Docker images to registries with emb resources publish
---

EMB can publish built resources (typically Docker images) to their registries. Publishing is **opt-in per resource** and is kept separate from building so you can safely run `emb resources build` in any context without accidentally pushing.

## How Publishing Works

The publish flow has three pieces:

1. **Resource opt-in** — Mark resources you want to publish with `publish: true` in their Embfile.
2. **Destination config** — Set the registry and optional publish-time tag in `defaults.docker.publish` (or per-resource as `params.publish`).
3. **Publish command** — Run `emb resources publish` to push every publishable resource (or a subset).

`emb resources publish` never builds. Run `emb resources build --publishable` first (or `emb resources build` to build everything).

## Marking Resources as Publishable

In a component's Embfile, add `publish: true` to any resource you want to ship:

```yaml
# api/Embfile.yml
resources:
  image:
    type: docker/image
    publish: true
    dependencies:
      - base:image
```

Resources without `publish: true` are treated as internal — they can still be depended upon (for example, a `base:image` that other components build on top of), but `emb resources publish` will never push them.

List what's marked as publishable:

```shell
emb resources --publishable
```

## Configuring the Destination

### Project Defaults

Set `defaults.docker.publish` in `.emb.yml` to control where images are pushed:

```yaml
# .emb.yml
defaults:
  docker:
    tag: ${env:DOCKER_TAG:-latest}
    publish:
      registry: ghcr.io/myorg           # Registry prefix to push to
      tag: ${env:VERSION}               # Optional: retag at publish time
```

Fields:

| Field | Description |
|-------|-------------|
| `registry` | Registry prefix prepended to the image name when pushing (e.g. `ghcr.io/myorg`) |
| `tag` | Optional tag used **only when publishing**, overriding the build tag |

If `publish.tag` is set, EMB retags the locally built image before pushing — useful for shipping a semver tag at release time while keeping `latest` for local development.

### Per-Resource Override

Any resource can override the defaults via its `params.publish`:

```yaml
# api/Embfile.yml
resources:
  image:
    type: docker/image
    publish: true
    params:
      publish:
        registry: internal-registry.example.com/platform
        tag: ${env:VERSION}
```

Resource-level values win over project defaults.

## Running a Publish

Publish every publishable resource:

```shell
emb resources publish
```

Publish a specific resource:

```shell
emb resources publish api:image
```

Preview without pushing (prints the final image references EMB would push):

```shell
emb resources publish --dry-run
```

Apply a flavor (for example, to swap the registry for a production target):

```shell
emb resources publish --flavor production
```

## Typical CI Workflow

In a release pipeline, the common pattern is:

```shell
# 1. Build only what will be shipped (skips internal base images unless depended on)
emb resources build --publishable --flavor production

# 2. Push everything marked publishable to the configured registry
emb resources publish --flavor production
```

The `--publishable` build flag trims the build graph to publishable resources and their transitive dependencies. Internal helpers that nothing publishable depends on are skipped, keeping CI fast.

## Flavors and Publishing

Flavors are the cleanest way to vary publish config by environment. Patch `defaults.docker.publish` in the flavor that should target a different registry or tag:

```yaml
# .emb.yml
defaults:
  docker:
    publish:
      registry: ghcr.io/myorg
      tag: ${env:DOCKER_TAG:-latest}

flavors:
  production:
    patches:
      - op: replace
        path: /defaults/docker/publish/registry
        value: registry.prod.example.com/platform
      - op: replace
        path: /defaults/docker/publish/tag
        value: ${env:VERSION}
```

Run with:

```shell
emb resources publish --flavor production
```

## Authentication

EMB does not manage registry credentials. Authenticate with the Docker CLI (or your CI's registry login action) before running `emb resources publish`:

```shell
docker login ghcr.io
```

## Non-Docker Resource Types

Only resource types that implement publishing can be marked `publish: true`. Today this is `docker/image`. Setting `publish: true` on an unsupported type raises a `PUBLISH_NOT_SUPPORTED` error at publish time — either remove the flag or change the resource type.

## See Also

- [CLI Reference: `emb resources publish`](/emb/reference/cli/#emb-resources-publish)
- [Configuration Reference: `defaults.docker.publish`](/emb/reference/configuration/#defaults)
- [Flavors](/emb/advanced/flavors/)
