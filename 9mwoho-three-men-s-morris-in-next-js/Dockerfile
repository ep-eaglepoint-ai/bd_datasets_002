# Use Node.js as base (no Python needed)
FROM node:20-slim

# Install git for git info collection
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy project files
COPY . /app

# Install dependencies for tests
WORKDIR /app/tests
RUN npm install

# Install dependencies for evaluation
WORKDIR /app/evaluation
RUN npm install

# Install dependencies for repository_after
WORKDIR /app/repository_after/three-mens-morris
RUN npm install

# Reset working directory
WORKDIR /app

# Default command (runs evaluation)
CMD ["npx", "ts-node", "evaluation/evaluation.ts"]
