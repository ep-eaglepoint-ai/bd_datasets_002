FROM node:20-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for Prisma/OpenSSL)
RUN apt-get update -y && apt-get install -y openssl

# Output/Artifacts directory for evaluation reports
RUN mkdir -p /app/evaluation/reports

# Copy package files first for caching
COPY repository_after/package.json repository_after/package-lock.json* ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY repository_after/ .
COPY tests ./tests

# Copy evaluation script
COPY evaluation /app/evaluation

# Generate Prisma Client
RUN npx prisma generate

# Default command
CMD ["npm", "test"]
