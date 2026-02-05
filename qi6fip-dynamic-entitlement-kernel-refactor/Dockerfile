# Base stage for shared dependencies and code
FROM node:18-slim AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Stage 1: repository_before testing
FROM base AS before
CMD ["npm", "run", "test:before"]

# Stage 2: repository_after testing
FROM base AS after
CMD ["npm", "run", "test:after"]

# Stage 3: evaluation
FROM base AS eval
CMD ["npm", "run", "evaluate"]
