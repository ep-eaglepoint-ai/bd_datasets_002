# Use Node.js 20 LTS with full glibc support
FROM node:20

WORKDIR /app

# Install system dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY repository_after/package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code and tests
COPY repository_after/ ./
COPY tests/ ../tests/
COPY evaluation/ ../evaluation/

# Create reports directory
RUN mkdir -p ../evaluation/reports

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Default command
CMD ["npm", "start"]