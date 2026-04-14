# rebuild-triggers

Demonstrates **flavor-aware rebuild triggers** for `docker/image` resources.

Two components, three strategies in play:

| Component      | Flavor-level default     | Resource-level override | Effective strategy |
| -------------- | ------------------------ | ----------------------- | ------------------ |
| `api`          | `watch-paths` (`dev`)    | —                       | flavor's           |
| `api`          | — (`prod` / no flavor)   | —                       | `auto`             |
| `docs-scraper` | — (any flavor)           | `always`                | `always`           |

## Layout

```
rebuild-triggers/
├── .emb.yml                 # flavor-level rebuildPolicy defined here
├── docker-compose.yml       # production compose
├── docker-compose.devel.yml # dev overlay: mounts src/ only, preserving
│                            # the node_modules installed inside the image
├── api/
│   ├── Dockerfile
│   ├── Embfile.yml          # no rebuildTrigger — uses flavor default
│   ├── package.json
│   └── src/
│       └── server.js
└── docs-scraper/
    ├── Dockerfile
    ├── Embfile.yml          # rebuildTrigger: { strategy: always }
    ├── package.json
    └── src/
        └── scrape.js
```

## Walkthroughs

### 1. Dev loop — fast iteration with `watch-paths`

```shell
emb resources build --flavor dev
```

For `api`, the flavor's `watch-paths` policy applies. Changing anything
under `api/src/` does **not** trigger a rebuild — `docker-compose.devel.yml`
bind-mounts `./api/src` into the container, so the running process sees
the new code (picked up by `node --watch`). A rebuild only happens when
`api/Dockerfile` or `api/package.json` changes — the image-shaping files.

For `docs-scraper`, the resource-level `strategy: always` wins over the
flavor default, so it rebuilds on every invocation — guaranteed fresh
external content, every run.

### 2. Production / CI — default `auto`

```shell
emb resources build --flavor prod
# or no flavor at all
emb resources build
```

`prod` doesn't define a `rebuildPolicy`, so `api` falls back to `auto`:
any change to a git-tracked file under `api/` triggers a rebuild. This is
the right default when you're not bind-mounting and any source change
needs to bake into the image.

`docs-scraper` still follows its resource-level `always` override.

### 3. Inspecting the decision

Non-`auto` builds (and any `--force` run) print the selected strategy,
source, reason, and — for `watch-paths` — the watched files with their
mtimes. Try:

```shell
emb resources build --flavor dev --dry-run
```

You'll see lines like:

```
strategy=watch-paths source=flavor
reason: strategy=watch-paths; newest=Dockerfile
watched:
  Dockerfile @ 2026-04-14T12:00:00.000Z
  package.json @ 2026-04-14T11:55:00.000Z
decision: rebuild
```

`auto` rebuilds stay silent by default to keep normal output compact.

## Precedence recap

The builder picks the effective trigger in this order, highest wins:

1. `resources.<name>.rebuildTrigger` on the resource itself (including
   via Embfile).
2. `flavors.<flavor>.defaults.rebuildPolicy['docker/image']` on the
   active flavor.
3. Built-in `{ strategy: auto }`.

Glob paths in `watch-paths` are resolved against the resource's docker
context. A leading `/` escapes to the monorepo root (useful when a
shared file like a root-level lockfile or base Dockerfile should
trigger rebuilds across components).
