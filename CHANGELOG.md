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
