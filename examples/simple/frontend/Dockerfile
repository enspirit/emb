FROM node:22 as dev

WORKDIR /home/app

COPY package*.json ./

RUN npm install

COPY ./ ./

CMD node dev.js

FROM dev as builder

RUN node build.js

FROM nginx as production

COPY --from=builder /home/app/index.html /usr/share/nginx/html/
