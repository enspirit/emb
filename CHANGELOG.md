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
