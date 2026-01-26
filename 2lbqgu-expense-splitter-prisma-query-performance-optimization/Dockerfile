FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy root package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy package files and install dependencies for the server
COPY repository_after/package*.json ./repository_after/
RUN cd repository_after && npm install

# Copy all files
COPY . .

# Generate Prisma client for Alpine Linux
RUN cd repository_after && npx prisma generate

CMD ["node", "evaluation/evaluation.js"]