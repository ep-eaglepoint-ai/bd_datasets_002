FROM node:20-slim

WORKDIR /app

# Install git for evaluation script
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./
COPY repository_after/contact-manager/package.json ./repository_after/contact-manager/package.json

# Install root dependencies
RUN npm install

# Copy source code
COPY . .

# Set up environment variables
ENV CI=true
