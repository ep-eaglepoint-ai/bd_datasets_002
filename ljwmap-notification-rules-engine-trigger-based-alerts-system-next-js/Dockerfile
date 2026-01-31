# syntax=docker/dockerfile:1
FROM node:22-alpine AS base

# Install system dependencies for SQLite and Evaluation
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Stage 2: Development & Test Environment
FROM base AS development
# Pull dependencies from the solution directory
COPY repository_after/package*.json ./
RUN npm install

# Copy everything (including repository_before and repository_after)
COPY . .

# Generate Prisma client using the schema in the 'after' folder
RUN npx prisma generate --schema=repository_after/prisma/schema.prisma

# Stage 3: Builder (Production)
FROM development AS builder
WORKDIR /app/repository_after
RUN npm run build

# Stage 4: Runner (Production)
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat
COPY --from=builder /app/repository_after/.next/standalone ./
COPY --from=builder /app/repository_after/.next/static ./repository_after/.next/static
COPY --from=builder /app/repository_after/public ./repository_after/public
EXPOSE 3000
CMD ["node", "server.js"]