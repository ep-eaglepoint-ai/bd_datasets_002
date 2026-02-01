FROM node:20-slim

WORKDIR /app

# Copy project files
COPY . /app

# Install dependencies at project root (for jest and tests)
RUN npm install --legacy-peer-deps && \
    echo "Checking if jest installed at root..." && \
    ls -la node_modules/.bin/jest || true

# Set environment
ENV NODE_ENV=test

# Default command
CMD ["npm", "test"]