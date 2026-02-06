# Build context is project root; app code lives in repository_after/
FROM node:20-alpine AS base
WORKDIR /app

# Dependencies
FROM base AS deps
COPY repository_after/package.json repository_after/package-lock.json* ./
RUN npm ci

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY repository_after/ .
RUN npx prisma generate
RUN npm run build

# Production runner
FROM base AS runner
RUN apk add --no-cache wget
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
RUN npx prisma generate

# Default: run API (worker overrides CMD in docker-compose)
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]

# Test stage: run Jest from project root (postgres + redis required)
FROM node:20-alpine AS test
WORKDIR /app
COPY package.json jest.config.js jest.setup.js jest.globalSetup.js tsconfig.json ./
COPY tests/ tests/
COPY evaluation/ evaluation/
RUN npm install
COPY repository_after/ repository_after/
WORKDIR /app/repository_after
RUN npm ci && npx prisma generate
WORKDIR /app
ENV UPLOAD_DIR=/app/tests/test-files
CMD ["npx", "jest", "--config", "jest.config.js", "--runInBand"]
