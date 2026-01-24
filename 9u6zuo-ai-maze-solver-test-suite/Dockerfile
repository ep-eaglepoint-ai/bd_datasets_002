FROM node:18-alpine

WORKDIR /app

# Copy test package.json first for better caching
COPY tests/package*.json ./tests/

RUN echo "Invalidate cache v3"

# Install test dependencies
ENV NODE_ENV=development
WORKDIR /app/tests
RUN npm install --no-cache --no-optional

# Copy all project files
WORKDIR /app
COPY . .

# Create evaluation reports directory
RUN mkdir -p evaluation/reports

# Default working directory
WORKDIR /app

CMD ["npm", "test"]
