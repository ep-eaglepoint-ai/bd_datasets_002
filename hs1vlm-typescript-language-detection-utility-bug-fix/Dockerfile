FROM node:20-slim

WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the project
COPY . .

# Default: run tests against repository_after (should pass)
CMD ["npm", "run", "test:after"]
