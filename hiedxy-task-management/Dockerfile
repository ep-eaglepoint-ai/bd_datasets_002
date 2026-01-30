FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN npm install -g ts-node

WORKDIR /app

# Copy source code (optional if mounting volume, but good for image completeness)
COPY . .
