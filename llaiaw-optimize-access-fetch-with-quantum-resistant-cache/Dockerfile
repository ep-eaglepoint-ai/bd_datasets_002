FROM node:20-slim

WORKDIR /app

# Copy project files
COPY . /app

# Install dependencies for repository_after
WORKDIR /app/repository_after
RUN npm install --legacy-peer-deps && \
    echo "Checking if jest installed in repository_after..." && \
    ls -la node_modules/.bin/jest || true

# Install dependencies for repository_before
WORKDIR /app/repository_before
RUN npm install --legacy-peer-deps && \
    echo "Checking if jest installed in repository_before..." && \
    ls -la node_modules/.bin/jest || true

# Set environment
ENV NODE_ENV=test

# Back to root
WORKDIR /app

# Default command
CMD ["npm", "test"]