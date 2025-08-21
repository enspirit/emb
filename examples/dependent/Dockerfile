ARG BASE_IMAGE=emb/base
FROM ${BASE_IMAGE}

WORKDIR /home/app

COPY ./dependencies.txt ./

RUN echo "base:image" >> ./dependencies.txt
