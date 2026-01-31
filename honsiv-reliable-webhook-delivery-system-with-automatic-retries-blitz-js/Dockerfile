# ============================================
# Stage 1: Base with System Dependencies
# ============================================
FROM node:20-alpine AS base

# Install system dependencies required for native modules and Prisma
RUN apk add --no-cache \
    openssl \
    postgresql-client \
    libc6-compat \
    python3 \
    make \
    g++

WORKDIR /app

# ============================================
# Stage 2: Dependencies Installation
# ============================================
FROM base AS deps

# Copy root package files first for caching
COPY package*.json ./
RUN npm ci --include=dev --prefer-offline --no-audit --legacy-peer-deps

# Copy repository_after package files
COPY repository_after/package*.json ./repository_after/
RUN cd repository_after && npm ci --include=dev --prefer-offline --no-audit --legacy-peer-deps

# ============================================
# Stage 3: Builder and Prisma Generation
# ============================================
FROM deps AS builder

# Copy Prisma schema and code
COPY repository_after/db ./repository_after/db
COPY repository_after/tsconfig.json ./repository_after/
COPY tsconfig.json ./

# Generate Prisma client
RUN cd repository_after && npx prisma generate

# Copy source code
COPY . .

# Build the Next.js application (if build script exists)
RUN cd repository_after && \
    if grep -q '"build"' package.json; then \
      npm run build; \
    else \
      echo "No build script found, skipping build"; \
    fi

# ============================================
# Stage 4: Production Runtime
# ============================================
FROM base AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy everything from builder (including node_modules and Prisma client)
COPY --from=builder /app /app

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]

# Default command (overridden in compose)
CMD ["node", "--version"]
