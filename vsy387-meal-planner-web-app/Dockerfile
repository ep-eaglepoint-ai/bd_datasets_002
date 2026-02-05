FROM node:20-slim

WORKDIR /app

# Copy all project files
COPY . /app

# Install root dependencies (for tests and evaluation)
RUN npm install

# Install repository_after dependencies
WORKDIR /app/repository_after
RUN npm install

# Back to root
WORKDIR /app

ENV NODE_ENV=test

CMD ["npm", "test"]
