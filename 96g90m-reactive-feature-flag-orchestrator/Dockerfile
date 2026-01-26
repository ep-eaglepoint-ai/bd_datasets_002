FROM node:20-slim

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install root dependencies (including jest, typescript, ts-node)
RUN npm install

# Create directory for app
WORKDIR /app/repository_after

# Copy app package files
COPY repository_after/package*.json ./

# Install app dependencies
RUN npm install

# Copy everything else (respecting .dockerignore)
# This copies tests, evaluation, and repository_after source code
WORKDIR /app
COPY . .

# Build the Next.js app
WORKDIR /app/repository_after
RUN npm run build

# Reset workdir to root for flexibility
WORKDIR /app

# Default command (can be overridden)
CMD ["npm", "start", "--prefix", "repository_after"]
