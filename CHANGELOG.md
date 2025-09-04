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
