ARG BASE_IMAGE=emb/base
FROM ${BASE_IMAGE} as base
ARG SOME_ARG

FROM base as development
CMD "echo [development build] We received SOME_ARG=${SOME_ARG} at build time"

FROM base as production
CMD "echo [production build] We received SOME_ARG=${SOME_ARG} at build time"

