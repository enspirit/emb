## 0.9.0 - 2024-08-22

* `emb start`

## 0.8.2 - 2024-08-22

* 'emb' defaults to 'emb tasks run' (eg. `emb test`)

## 0.8.1 - 2024-08-22

* Tasks run on local executor by default if component is not backed by a running compose service

## 0.8.0 - 2024-08-22

* Ask for confirmation before running tasks by providing `confirm` settings on task settings
* `emb images push` takes into account env var `DOCKER_REGISTRY` if present
