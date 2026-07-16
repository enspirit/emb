## Unreleased

Parallel resource builds, plus correctness and security fixes from a full codebase audit.

* Build resources in parallel
  - New `--jobs`/`-j` flag on `emb resources build` and `emb up`: build up to N resources at once, or `auto` (min of CPU count and 4). Dependency order is always respected — a resource starts only once all of its dependencies have succeeded
  - New `--keep-going`/`-k` flag: after a failure, keep building resources that don't depend on it, then report every failure together. Fail-fast remains the default
  - New `defaults.build.concurrency` key in `.emb.yml` (a positive integer or `"auto"`) sets the project-wide default
  - Precedence is `--jobs` > `defaults.build.concurrency` > `1`, so builds stay serial unless you opt in
  - Build failures are now aggregated into a single `BUILD_FAILED` error listing every failed resource and every dependent that was skipped, instead of surfacing only the first builder error. Resources queued behind a dependency render `Waiting for <deps>`

* Harden secret handling
  - Values containing `$$`, `` $` ``, `$&`, `$'` (e.g. Vault/1Password passwords) are inserted literally instead of being mangled as `String.replace` patterns
  - Plugin config is template-expanded, so documented `${env:...}` placeholders (vault `address`/`token`, …) resolve instead of reaching the provider as literal strings
  - `file` resources embedding secrets are written `0600` (owner-only), not world-readable
  - Docker `--build-arg` secret values are redacted (`key=***`) from build logs
  - Kubernetes pod exec env values and working dir are POSIX single-quoted, preventing shell expansion, command injection, and silent corruption

* Fix docker image builds and caching
  - `emb images prune` filters to this project's dangling images instead of pruning every dangling image on the host; `--all` now works
  - `auto` rebuild strategy no longer reports a false cache hit (skipping the build) when the context has no git-tracked files
  - A rebuild is forced when the built image was removed out-of-band (e.g. `docker system prune`)
  - Interactive container exec output is no longer garbled (raw TTY streams are piped, not demultiplexed)
  - `emb logs archive` honors the process exit code and flushes the log file — no false success, no truncation

* Fix kubernetes operations
  - `emb kubernetes restart` works when the pod template has no annotations (strategic merge patch, like `kubectl rollout restart`)
  - Interactive kubernetes tasks no longer hang the CLI after the remote command exits

* Fix CLI flavors and task output
  - `start` and `restart` support flavors (`--flavor` / `EMB_FLAVOR`), consistent with `up`/`down`/`stop`/`ps`
  - Flavored env expansion (`VAR: ${env:VAR:-flavor-default}`) is no longer polluted by the base flavor's installed values
  - Non-string flavor JSON-patch values (numbers, booleans, null) are preserved instead of being corrupted to `{}` or crashing
  - Local task output routes through the task renderer and per-task log file (was bypassing both)

* Tooling
  - `npm test` builds before integration tests, so they exercise current sources instead of a stale/missing `dist/`
  - Fixed vitest path resolution so CLI command modules are unit-testable

## 0.30.2 - 2026-06-10

* Suppress the Node.js `punycode` deprecation warning via dependency `overrides`

## 0.30.1 - 2026-04-30

* Fix `DotEnvPlugin` to load `.env` files at construction instead of `init()`
  - Monorepo env-block expansion (e.g. `FOO: ${env:FOO:-default}`) runs right after plugins are instantiated, before any plugin's async `init()`
  - Loading dotenv in the constructor ensures values from `.env` are visible during that expansion

## 0.30.0 - 2026-04-23

* Add task→resource dependencies
  - Tasks now accept `dependencies: [...]` listing resource refs that must be built before the task script runs
  - Bare names resolve against the task's own component first, then fall back to global lookup; fully qualified `component:resource` refs also supported
  - Fix `CreateFileOperation` to `mkdir -p` the target's parent directory, unbreaking `file` resources with nested paths

* Allow `/` in resource refs
  - Resource names can contain `/` (coming from the YAML key), so refs to them in `pre`, `dependencies`, etc. now permit `/` too
  - Component and plugin names keep the stricter pattern — slashes are only allowed in the name suffix of a qualified ref, not in the `component:` prefix

* Add `op/file` resource type for 1Password file attachments
  - Declaratively materialize a 1Password attachment on disk, instead of text-interpolating `${op:...}` (which can't carry binary safely through the template pipeline)
  - Writes raw bytes via `op read --force --out-file`, bypassing stdout UTF-8 corruption that would otherwise mangle keystores, `.p8` keys, etc.
  - Params: `reference` (required, must start with `op://`) and optional `path` (defaults to the resource name)

## 0.29.0 - 2026-04-14

* Honor `.dockerignore` when listing sources for `docker/image` builds
  - `builderInput.src` (surfaced in `resources build --dry-run --json`) now excludes files matched by `.dockerignore` in the build context
  - Uses `@balena/dockerignore` for docker-spec-compliant pattern matching
  - Only affects source enumeration — the CLI build path already relied on the docker daemon to apply `.dockerignore`

## 0.28.1 - 2026-04-14

* Honor `EMB_VERBOSE` and `EMB_FLAVOR` env vars as fallbacks for `--verbose` and `--flavor`
  - CLI flag still takes precedence over the env var
  - Document env-var fallbacks and resolution order in the CLI reference

## 0.28.0 - 2026-04-14

* Add flavor-aware rebuild triggers for `docker/image` resources
  - `rebuildTrigger: auto` (default) — newest-mtime across git-tracked files in context
  - `rebuildTrigger: always` — rebuild every invocation
  - `rebuildTrigger: watch-paths` — rebuild only when listed paths change (docker-context-relative, leading `/` escapes to monorepo root)
  - Configurable per resource, or as flavor-wide default under `flavors.<flavor>.defaults.rebuildPolicy['docker/image']`
  - Precedence: resource > flavor default > builtin auto; `--force` and dep-cascade invariants preserved
  - Selected strategy, source, reason, and watched paths are surfaced in build output (auto stays silent)
* Document rebuild triggers with a runnable example

## 0.27.1 - 2026-04-12

* Document resource publishing end-to-end
  - New `advanced/publishing.md` covering `publish: true`, `defaults.docker.publish`, `emb resources publish`, CI workflow, and flavor patching
  - Extend production-ready example with `defaults.docker.publish.registry` and a production flavor that sets `publish.tag` from `VERSION`

## 0.27.0 - 2026-04-12

* Sync docs with current codebase
  - Fix task/flavor syntax in concepts (`script:`, `patches:`)
  - Update version/arch in `--help` and `--version` output examples
  - Add `PUBLISHABLE` column to `emb resources` output samples
  - Add `publish: true` and kubernetes defaults to tutorial snippets
  - Expand `emb secrets` reference with per-subcommand docs
  - Bump Node.js requirement note to 22+
* Remove dormant `executor` (singular) from `TaskConfig` JSON Schema; runtime only reads `executors` (plural)

## 0.26.0 - 2026-04-12

* Task scripts now fail fast on the first failing command
  - Multiline scripts run through `bash -eo pipefail -c` instead of `sh`
  - Intermediate non-zero exits now abort the script (previously ignored)
  - Pipelines propagate failures via `pipefail` (e.g. `false | true` now fails)
  - **Breaking:** requires `bash` on PATH (previously `/bin/sh` was used)

## 0.25.6 - 2026-04-10

* Improve config validation error reporting with per-file details

## 0.25.5 - 2026-04-08

* Fix npm publish: explicitly set `NODE_AUTH_TOKEN` from `NPM_TOKEN` secret

## 0.25.4 - 2026-04-08

* Remove test gate from release workflow for faster tag deploys

## 0.25.3 - 2026-04-08

* Fix release pipeline: add QEMU/Buildx for cross-platform Docker builds
* Add manual force-release workflow to bypass CI tests

## 0.25.2 - 2026-04-07

* Support projects without a docker-compose setup

## 0.25.1 - 2026-02-02

* Fix publish operation failing when publishable resources have non-publishable dependencies

## 0.25.0 - 2026-02-02

* Implement publishable resources abstraction
* Add Docker credential helper support for image push

## 0.24.0 - 2026-01-29

* Add kubernetes executor for running tasks on K8s pods

## 0.23.0 - 2026-01-28

* Add optional component arguments to `stop` and `down` commands
* Use consistent 'service' terminology across docker-compose operations

## 0.22.1 - 2026-01-27

* Add `content` property to file resource schema

## 0.22.0 - 2026-01-27

* Add `content` parameter to file resource for secrets support

## 0.21.0 - 2026-01-27

* Support multiple Docker images per component
  - Add explicit `image` and `tag` fields to `docker/image` resource

## 0.20.2 - 2026-01-25

* Make 1Password secret provider connection lazy

## 0.20.1 - 2026-01-24

* Fix terminal size handling for interactive container exec

## 0.20.0 - 2026-01-24

* Add 1Password CLI (`op`) integration as secret provider

## 0.19.0 - 2026-01-24

* Add Docker image platform/architecture support
* Convert production-ready example API to TypeScript
* Fix secrets integration test setup for Keycloak 26+

## 0.18.0 - 2026-01-23

* Add `emb logs archive` command for archiving docker compose logs

## 0.17.1 - 2026-01-22

* Fix interactive task TTY passthrough and improve error logging
* Add GitHub Actions release workflow and `bin/release` script
* Speed up unit tests by removing global `beforeEach` from test setup
* Various release pipeline fixes (0.17.2 – 0.17.5)

## 0.17.0 - 2026-01-17

* Extend `emb logs` to support multiple components and all containers
  - `emb logs` without args shows interlaced logs of all containers
  - `emb logs api web` shows logs for multiple services
  - Uses `docker compose logs` for better performance and native interlacing

## 0.16.0 - 2026-01-17

* Restructure documentation with multi-tutorial approach
  - Hello World tutorial for beginners
  - Fullstack App tutorial for docker-compose workflows
  - Microservices tutorial for complex dependencies
  - Production Ready tutorial for flavors and multi-stage builds
* Add example monorepos in `examples/` directory
* Migrate integration tests to use example monorepos
* Add `emb secrets` commands for dry-run validation
  - `emb secrets` - List secret references in configuration
  - `emb secrets validate` - Validate secrets can be resolved
  - `emb secrets providers` - Show configured providers
* Add encryption for cached Vault tokens

## 0.15.0 - 2026-01-15

* Add secrets management with HashiCorp Vault integration
  - Support for token, AppRole, Kubernetes, JWT, and OIDC authentication
  - Automatic token caching to avoid repeated browser authentication
  - Secret references in configuration: `${secret:path/to/secret:key}`
* Add task name autocompletion for bash and zsh
* Add documentation website with Astro Starlight
* Add migration guide from makefile-for-monorepos
* Improve test coverage across all modules

## 0.14.0 - 2025-11-26

* Add support for interactive commands
* `emb ps` is an alias of `docker compose ps`

## 0.13.2 - 2025-10-21

* Fix `emb start` and `emb restart` when not provided with specific component list

## 0.13.1 - 2025-09-04

* Fix inter-tasks prereq. references.

## 0.13.0 - 2025-09-02

* Support for 'kubernetes shell'

## 0.12.0 - 2025-09-02

* Support for 'kubernetes' topic (logs|ps|restart)

## 0.11.0 - 2025-08-23

* Improve support for complex monorepo structures
* Improve resources list (sort by ID)
* Fix docker compose services loading
* Only build file resources when target is missing
* Follow symlinks when discovering Embfiles

## 0.10.1 - 2025-08-22

* Improve some commands' hints

## 0.10.0 - 2025-08-22

* Add support for `--verbose` flag on all commands.

## 0.9.0 - 2025-08-22

* `emb start`

## 0.8.2 - 2025-08-22

* 'emb' defaults to 'emb tasks run' (eg. `emb test`)

## 0.8.1 - 2025-08-22

* Tasks run on local executor by default if component is not backed by a running compose service

## 0.8.0 - 2025-08-22

* Ask for confirmation before running tasks by providing `confirm` settings on task settings
* `emb images push` takes into account env var `DOCKER_REGISTRY` if present
