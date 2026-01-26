FROM node:18-alpine

WORKDIR /app/tests

# Copy the test dependencies manifest
COPY tests/package.json ./

# Install all dependencies (Test + Server + Client deps must be here)
RUN npm install

# CRITICAL: This allows code in ../server to find modules installed in /app/tests/node_modules
ENV NODE_PATH=/app/tests/node_modules

CMD ["npm", "test"]