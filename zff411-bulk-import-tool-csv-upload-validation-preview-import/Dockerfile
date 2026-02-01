# Dockerfile for Bulk Import Tool
# Builds the Next.js app and runs tests

FROM node:20-slim AS builder

WORKDIR /app

# Copy package files from repository_after
COPY repository_after/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY repository_after/ ./

# Build the app
RUN npm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

# Copy built app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start the app
CMD ["npm", "run", "start"]

# Test stage - for running Playwright tests
FROM mcr.microsoft.com/playwright:v1.41.0-jammy AS tester

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy configuration and tests
COPY tsconfig.json playwright.config.ts ./
COPY tests/ ./tests/
COPY evaluation/ ./evaluation/

# Set environment variable for app URL
ENV APP_URL=http://bulk-import-app:3000

# Run tests
CMD ["npm", "run", "evaluate"]
