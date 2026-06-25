# RIPPLR Orchestrator — production container
# Self-contained: SQLite DB is created and seeded on first boot.
FROM node:22-slim

WORKDIR /app

# openssl is required by Prisma's query engine
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies (incl. dev deps: prisma CLI + tsx are needed to
# generate the client, push the schema and seed at first boot)
COPY package.json package-lock.json ./
RUN npm ci

# Build the app
COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
# DB lives on a writable path; mount a volume here to persist it.
ENV DATABASE_URL=file:/data/dev.db
RUN mkdir -p /data

# PORT is supplied by the host (Render/Railway/Fly inject it); default 3000.
ENV PORT=3000
EXPOSE 3000

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
