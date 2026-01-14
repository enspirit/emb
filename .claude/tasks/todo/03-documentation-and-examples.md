# Problem to solve

Let's work on a first pragmatic website with the documentation of `Emb` its config files and examples of its usage. I'd like the documentation to start with the most straightforward/simple use case of a simple docker-based monorepo, and then show advanced usages one by one, by adding complexity to it.

# Idea

I'd like us to find a way to write the documentation in such a way that the examples of commands are actually running as integration tests inside an example monorepo. (you can look at the commits `69ca879` & `e30a22d` where I played with some ideas)

Let's start with a very first step where we put the bases for the following acceptance criterias:

* The website uses astro or equivalent
* The documentation is written in such a way that it actually runs in a monorepo (subfolder) showcasing the different use cases
* The code blocks in the documentation are used and executed to ensure the command actually work, combining documentation with integration testing