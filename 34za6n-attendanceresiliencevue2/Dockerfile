FROM node:18-alpine

WORKDIR /app

# Install git for any dependencies that might need it
RUN apk add --no-cache git

# Copy package files first for better caching
COPY repository_after/package*.json ./repository_after/
WORKDIR /app/repository_after
RUN npm install

# Copy test package.json and install if needed
WORKDIR /app
COPY tests/package*.json ./tests/
WORKDIR /app/tests
RUN npm install --production || true

# Copy the rest of the application
WORKDIR /app
COPY repository_after/ ./repository_after/
COPY tests/ ./tests/
COPY evaluation/ ./evaluation/

# Run comprehensive tests for evaluation
WORKDIR /app/tests
CMD ["npm", "run", "evaluate"]
