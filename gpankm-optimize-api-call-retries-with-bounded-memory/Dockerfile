# syntax=docker/dockerfile:1
# Use DOCKER_BUILDKIT=1 for better caching (e.g. in CI).
FROM node:18-alpine

WORKDIR /app

# Install dependencies (--no-audit, --progress=false to reduce build time)
COPY package*.json ./
RUN npm ci --no-audit --progress=false

# Copy source (.dockerignore excludes node_modules, .git, logs, etc.)
COPY . .

# Default: test-after (repository_after); --expose-gc for benchmark
CMD ["node", "--expose-gc", "-r", "ts-node/register", "tests/test.ts", "--repo=../repository_after/safaricom_calls"]
