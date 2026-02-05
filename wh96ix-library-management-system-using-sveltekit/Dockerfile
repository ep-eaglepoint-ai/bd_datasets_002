FROM node:20-slim
WORKDIR /app

# Install curl for connectivity testing and healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy repository_after (contains all app code, configs, and will have tests/evaluation)
COPY repository_after /app/repository_after

# Copy tests and evaluation folders to be accessible from repository_after
COPY tests /app/tests
COPY evaluation /app/evaluation

# Install dependencies and generate Prisma Client
WORKDIR /app/repository_after
RUN npm install && npx prisma generate

# Default command for test services (run from repository_after)
WORKDIR /app/repository_after
CMD ["npm", "run", "test"]
