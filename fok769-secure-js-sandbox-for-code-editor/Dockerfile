FROM node:18-slim

WORKDIR /app

# Copy package files first for better caching
COPY package.json ./

# Install root dependencies (ensure devDependencies are installed)
# Explicitly set NODE_ENV to ensure devDependencies are installed
RUN NODE_ENV=development npm install --no-audit --no-fund

# Copy project files (node_modules will be preserved from previous layer due to .dockerignore)
COPY . /app

# Default command
CMD ["npm", "test"]
