FROM node:18-bookworm

WORKDIR /app

# Copy package files first for better caching
COPY repository_after/package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY repository_after/ .

# Generate Prisma client (this also downloads the required engines)
RUN npx prisma generate

# Expose the application port
EXPOSE 3000

# Start the development server
CMD ["npm", "run", "dev"]
