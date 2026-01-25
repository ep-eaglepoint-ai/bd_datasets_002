# Use Node.js as base
FROM node:20-slim

# Install git for git info collection
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy all project files
COPY . /app

# Single npm install at root (workspaces handles all dependencies)
RUN npm install

# Default command (runs evaluation)
CMD ["npm", "run", "evaluate"]
