# Use Node.js as base
FROM node:20-slim

# Install git for git info collection
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy remaining project files
COPY . .

# Default command (runs evaluation)
CMD ["npm", "run", "evaluate"]
