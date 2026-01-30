FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY vitest.config.js ./

# Install dependencies
RUN npm install

# Copy source and test files
COPY repository_before/ ./repository_before/
COPY repository_after/ ./repository_after/
COPY tests/ ./tests/
COPY evaluation/ ./evaluation/

# Create reports directory
RUN mkdir -p /app/evaluation/reports

# Default command
CMD ["npm", "run", "test"]