FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package files and install dependencies
COPY package.json ./
RUN npm install

# Copy the rest of the project files
COPY . .

# Install dependencies for repository_after and generate Prisma client
WORKDIR /app/repository_after
RUN npm install
RUN if [ -f "./prisma/schema.prisma" ]; then npx prisma generate --schema=./prisma/schema.prisma; fi

WORKDIR /app

# Default command
CMD ["npm", "run", "evaluate"]
