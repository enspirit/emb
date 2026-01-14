# Multi-stage Dockerfile for the API service
FROM node:22-alpine AS development

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD ["node", "server.js"]

FROM development AS production

ENV NODE_ENV=production
RUN npm ci --only=production
CMD ["node", "server.js"]
