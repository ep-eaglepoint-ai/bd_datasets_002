# IoT Sensor Dashboard Dockerfile
# Multi-stage build for testing backend and frontend

FROM node:20-slim AS base
WORKDIR /app
COPY package*.json ./
COPY repository_after/server/package*.json ./repository_after/server/
COPY repository_after/client/package*.json ./repository_after/client/

# Install all dependencies
RUN npm install
RUN cd repository_after/server && npm install
RUN cd repository_after/client && npm install

# Copy source files
COPY . .

# Default command runs all tests
CMD ["npm", "test"]
