## Tasks

[x] ability to run a task inside a container / locally

* ability to take a shell on a running container (`make auth.bash`) (include ability to specify which shell the containers can have (bash by default / sh / etc))

[ ] Abstract the executor option for tasks to allow creation of other executors (k8s, ...)
[ ] Add ability to specify when a task only supports specific executors (only local / only container / ...)

* When running a task, I should be able to pass custom environment variable easily: `eg: FAILFAST=1 emb run task webspicy:tests` (is it possible easily on both local and docker runner?)

* Test the ability to run tasks such as "make e2e.open"

* Ability to define tasks for 'components' that are not 'services' and are not building 'images' (define and refine vocabulary)

* Ability to have tasks using prerequisites tasks. Eg:
  * db.wait -> dbagent.on (this could be 'automatic' by detecting the container is not on?)
  * db.base -> cache.clear

* Ability to define inverted dependencies (through plugins or events?)
  * when db.base -> cache.clear
  * when db.seed -> cache.clear
  * when db.* -> cache.clear

## Config files

* Ability to split one long .emb.yml file into multiple files (imports?) and move parts into their components folder (like we had for */makefile.mk)

* Ability to specify which .env need to be autoloaded (some of our repos were including .env.commons + .env)

## Pre-requisites

* Our docker-compose sometimes depends on env files that are not part of the git and need to be auto-created

* Some of our make targets had pre-requisites that are files not saved in the git (android keystores, for instance). Some tasks must be able to provide a list of pre-requisites that need to be checked pre-run
