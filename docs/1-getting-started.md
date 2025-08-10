# Getting started

## Create an `.emb.yml` such as [the one in this example](../examples/.emb.yaml)

```yaml filename=".emb.yml"
project:
  name: monorepo
```

You're already ready to go :). On a simple project respecting our conventions (such as [this simple monorepo](../examples/)) running the following should give you the output as below:

```shell exec
emb components
```
```output generated

  NAME           IMAGE_NAME         TAG      CONTAINER
  autodiscover   emb/autodiscover   latest
  base           emb/base           latest
  buildargs      emb/buildargs      latest
  dependent      emb/dependent      latest
  frontend       emb/frontend       latest
  simple         emb/simple         latest
```

This shows us the components discovered by emb and that we are ready to build/use etc.

Other commands you are already ready to use are:

```shell exec
emb ps
```
```output generated

  ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAME
```

Which shows that nothing is currently running

Or even

```shell exec
emb images
```
```output generated

  NAME   TAG   IMAGE_ID   CREATED   SIZE
```
Which in turn shows that we haven't built any images for this project yet.

So we are basically ready to go. Do you want to know what's gonna be your most used command, daily?

```shell
emb up
````

Let's see what it does and what the rest of your day-to-day is gonna look like in the [next chapter](./2-day-to-day.md).
