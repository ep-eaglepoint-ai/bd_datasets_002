# IoT Sensor Dashboard Dockerfile

# Stage 1: Base (Dependencies)
FROM node:20-slim AS base
WORKDIR /app
COPY package*.json ./
COPY repository_after/server/package*.json ./repository_after/server/
COPY repository_after/client/package*.json ./repository_after/client/

# Stage 2: Dependencies
FROM base AS dependencies
# Install all dependencies (hoisted to root due to workspaces)
WORKDIR /app
RUN npm install

# Stage 3: Development/Test (Source Code)
FROM dependencies AS test-env
WORKDIR /app
COPY . .
CMD ["npm", "test"]

# Stage 4: Production Server
FROM node:20-slim AS server
WORKDIR /app
# Copy hoisted node_modules
COPY --from=dependencies /app/node_modules ./node_modules
# Copy server source code
COPY repository_after/server ./
# Ensure DB directory exists
RUN mkdir -p /app/data
ENV PORT=3001
CMD ["node", "src/index.js"]

# Stage 5: Client Builder
FROM dependencies AS client-builder
WORKDIR /app
COPY . .
WORKDIR /app/repository_after/client
RUN npm run build

# Stage 6: Production Client (Serving Static)
# Ideally we use Nginx, but for "simple fullstack", let's use a lightweight server or just serve from backend?
# Let's mock a production web server using `serve`
FROM node:20-slim AS client
WORKDIR /app
RUN npm install -g serve
COPY --from=client-builder /app/repository_after/client/dist ./dist
CMD ["serve", "-s", "dist", "-l", "80"]

