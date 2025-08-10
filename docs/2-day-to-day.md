# Day to day

The main command you'll use at the start of every single of your working day is most probably going to be `make up` (as we've seen in [the previous chapter](./1-getting-started.md))

If you know [docker compose](https://docs.docker.com/compose/), the concept is similar (since most of emb relies on existing tools such as docker & docker compose).

The difference resides mainly in the fact that `emb` is there to help developers think as little as possible as what tbey need to do in terms of docker builds and maintenance and just be smart for them. `emb` will also try to leverage the best cache mechanism depending on the context. For instance running `emb` on a monorepo, as a developer, is not the same thing as running it on `ci` platforms.

## What is currently running

```shell exec
emb ps
```

## My day is done

```shell exec
emb down
```
