FROM node:20-slim

WORKDIR /app

# Copy project files
COPY . /app

# Install dependencies at root level
RUN npm install --legacy-peer-deps

# Set environment
ENV NODE_ENV=test

# Default command
CMD ["npm", "test"]
