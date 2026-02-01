# Build stage for frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/client
COPY repository_after/client/package*.json ./
RUN npm install --no-audit --no-fund
COPY repository_after/client ./
RUN npm run build

# Setup backend
FROM node:22-alpine
WORKDIR /app
COPY repository_after/server/package*.json ./
RUN npm ci --production
COPY repository_after/server ./

# Copy built frontend to backend's public directory
# Express needs to be configured to serve this, or we rely on a separate server?
# Requirement 1: SPA.
# Usually we serve static files from Express in this setup.
COPY --from=frontend-builder /app/client/dist ./public

# We need to modify server/index.js to serve static files if we want a single container.
# Or we can run two containers?
# "Build a minimal but robust full-stack QR code generator" -> usually implies one deployable unit or docker-compose.
# User asked to "dockerize everything".
# I'll stick to serving frontend from backend for simplicity in "app" service.

EXPOSE 3000
CMD ["node", "index.js"]
