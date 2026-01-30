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
