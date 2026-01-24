# Base stage with common setup
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

# Development stage - includes dev dependencies and tools
FROM base AS development
COPY package.json ./
RUN npm install
COPY . ./
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production build stage
FROM base AS builder
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production stage - minimal image
FROM base AS production
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
