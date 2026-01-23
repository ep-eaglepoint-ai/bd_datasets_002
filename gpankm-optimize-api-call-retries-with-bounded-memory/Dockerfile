FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source (.dockerignore excludes node_modules, .git, logs, etc.)
COPY . .

# Default: test-after (repository_after); --expose-gc for benchmark
CMD ["node", "--expose-gc", "-r", "ts-node/register", "tests/test.ts", "--repo=../repository_after/safaricom_calls"]
