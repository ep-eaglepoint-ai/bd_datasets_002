# Multi-stage Dockerfile for Survey Builder & Analytics
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Stage 1: Dependencies
FROM base AS deps
# Copy package files
COPY repository_after/package*.json ./
# Install production dependencies only
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

# Stage 2: Builder
FROM base AS builder
# Copy package files and install all dependencies (including dev)
COPY repository_after/package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY repository_after/ ./

# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Stage 3: Test runner (optional stage)
FROM base AS test
# Copy package files and install all dependencies
COPY repository_after/package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY repository_after/ ./repository_after/

# Copy tests into the container at the expected location
COPY tests/ ./tests/

# Copy Jest config
COPY jest.config.js ./jest.config.js

# Set environment for testing
ENV NODE_ENV=test
ENV CI=true

# Don't run tests during build, let docker-compose handle it
CMD ["npx", "jest"]

# Stage 4: Evaluation runner
FROM test AS evaluation
# Copy evaluation scripts
COPY evaluation/ ./evaluation/

# Install tsx for TypeScript execution and ensure shell is available
RUN npm install -g tsx && \
    apk add --no-cache bash

# Change to repository_after directory where package.json is located
WORKDIR /app/repository_after

# Default command for evaluation
CMD ["npm", "run", "evaluate"]

# Stage 5: Production runner
FROM base AS runner
# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone output from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy health check script
COPY --from=builder --chown=nextjs:nodejs /app/healthcheck.js ./healthcheck.js

# Set correct permissions
USER nextjs

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Default command (standalone output creates server.js automatically)
CMD ["node", "server.js"]
