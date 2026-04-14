FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

# In a real scraper this would fetch external content.
# We fake it with a timestamped file so each build produces a different image.
RUN echo "scraped at $(date -Iseconds)" > /app/snapshot.txt

COPY src ./src

CMD ["node", "src/scrape.js"]
