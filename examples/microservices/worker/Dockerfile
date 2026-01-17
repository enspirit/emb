ARG DOCKER_TAG=latest
FROM microservices/base:${DOCKER_TAG}

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY worker.js ./

CMD ["node", "worker.js"]
