FROM node:18-alpine

WORKDIR /app

# Copy all project files
COPY . .

# Set working directory for tests
WORKDIR /app/tests

# Default command
CMD ["node", "run_tests.js"]