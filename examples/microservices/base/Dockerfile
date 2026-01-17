FROM node:22-alpine

# Install common dependencies
RUN apk add --no-cache curl

WORKDIR /app

# Copy shared utilities
COPY utils.js ./

# Set default environment
ENV NODE_ENV=development
